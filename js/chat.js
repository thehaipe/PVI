$(function() {
    const socket = io(CHAT_CONFIG.socketUrl);
    const currentUserId = String(CHAT_CONFIG.currentUser.id);
    const usersById = new Map(CHAT_CONFIG.users.map(user => [String(user.id), user]));
    const roomsById = new Map(CHAT_CONFIG.rooms.map(room => [String(room.id), {
        ...room,
        memberIds: room.memberIds.map(String),
    }]));
    const conversations = new Map();

    let activeRoomId = $('.contact-item.active').data('room')?.toString() || '';

    function formatTime(isoDate) {
        return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getConversation(roomId) {
        const normalizedId = String(roomId);
        if (!conversations.has(normalizedId)) {
            conversations.set(normalizedId, {
                messages: [],
                unread: false,
                lastMessageAt: '',
            });
        }

        return conversations.get(normalizedId);
    }

    function getRoomMembers(room) {
        return (room?.memberIds || [])
            .map(memberId => usersById.get(String(memberId)))
            .filter(Boolean);
    }

    function getRoomInitials(room) {
        return getRoomMembers(room)[0]?.initials || 'R';
    }

    function ensureRoomListItem(room) {
        let $room = $(`.contact-item[data-room="${room.id}"]`);
        if ($room.length) return $room;

        $room = $(`
            <div class="contact-item" data-room="${room.id}">
                <div class="avatar avatar-sm">${getRoomInitials(room)}</div>
                <div class="contact-info">
                    <div class="contact-header-row">
                        <p class="contact-name"></p>
                        <span class="contact-time">--:--</span>
                    </div>
                    <p class="contact-last-msg">No messages yet</p>
                </div>
                <span class="unread-indicator" aria-label="Unread message"></span>
            </div>
        `);
        $room.find('.contact-name').text(room.name);
        $('#roomList').append($room);

        return $room;
    }

    function openNewRoomModal() {
        $('#newRoomForm')[0].reset();
        $('#newRoomError').text('').hide();
        $('#newRoomModal').show();
        $('#roomName').trigger('focus');
    }

    function closeNewRoomModal() {
        $('#newRoomModal').hide();
        $('#newRoomError').text('').hide();
    }

    function updateRoomPreview(roomId, message) {
        const room = roomsById.get(String(roomId));
        const $room = ensureRoomListItem(room);
        const conversation = getConversation(roomId);

        $room.find('.contact-last-msg').text(message.text);
        $room.find('.contact-time').text(formatTime(message.createdAt));
        $room.toggleClass('has-unread', conversation.unread === true);

        $('#roomList').prepend($room);
    }

    function renderRoomMembers(room) {
        const $members = $('#roomMembers');
        const memberIds = new Set((room?.memberIds || []).map(String));

        $members.empty();

        getRoomMembers(room).forEach(member => {
            const canRemove = String(member.id) !== currentUserId && memberIds.size > 1;
            $members.append(`
                <button
                    class="member-avatar ${canRemove ? 'can-remove' : ''}"
                    type="button"
                    data-user-id="${member.id}"
                    ${canRemove ? `aria-label="Remove ${member.name}"` : `aria-label="${member.name}"`}
                >
                    ${member.initials}
                    ${canRemove ? '<span class="member-remove">-</span>' : ''}
                </button>
            `);
        });

        const availableUsers = CHAT_CONFIG.users.filter(user => !memberIds.has(String(user.id)));
        if (availableUsers.length > 0) {
            $members.append(`
                <button class="member-avatar add-member-button" type="button" aria-label="Add member">+</button>
            `);
        }
    }

    function renderAddMemberMenu(room) {
        const memberIds = new Set((room?.memberIds || []).map(String));
        const availableUsers = CHAT_CONFIG.users.filter(user => !memberIds.has(String(user.id)));
        const $existingMenu = $('.add-member-menu');

        if ($existingMenu.length) {
            $existingMenu.remove();
            return;
        }

        if (!availableUsers.length) return;

        const $menu = $('<div class="add-member-menu"></div>');
        availableUsers.forEach(user => {
            $menu.append(`
                <button type="button" data-user-id="${user.id}">
                    <span class="avatar avatar-xs">${user.initials}</span>
                    <span>${user.name}</span>
                </button>
            `);
        });

        $('#roomMembers').append($menu);
    }

    function renderConversation(roomId, options = {}) {
        const markRead = options.markRead !== false;
        const room = roomsById.get(String(roomId));
        const conversation = getConversation(roomId);
        const $chatMessages = $('#chatMessages');

        if (!room) return;

        activeRoomId = String(roomId);
        if (markRead) {
            conversation.unread = false;
        }

        $('.contact-item').removeClass('active');
        const $room = $(`.contact-item[data-room="${roomId}"]`).addClass('active');
        $room.toggleClass('has-unread', conversation.unread === true);

        $('#activeChatAvatar').text(getRoomInitials(room));
        $('#activeChatName').text(room.name);
        $('#roomStatus').text(`${room.memberIds.length} members`);
        renderRoomMembers(room);

        $chatMessages.empty();
        conversation.messages.forEach(message => {
            const messageType = message.senderId === currentUserId ? 'outgoing' : 'incoming';
            const senderLabel = message.senderId === currentUserId ? '' : `<span class="message-sender">${message.senderName}</span>`;
            $chatMessages.append(`
                <div class="message ${messageType}">
                    ${senderLabel}
                    <div class="message-bubble"></div>
                    <span class="message-time">${formatTime(message.createdAt)}</span>
                </div>
            `);
            $chatMessages.find('.message-bubble').last().text(message.text);
        });

        $chatMessages.scrollTop($chatMessages[0].scrollHeight);
    }

    function receiveMessage(message) {
        const roomId = String(message.roomId || '');
        if (!roomId || !roomsById.has(roomId)) return;

        const conversation = getConversation(roomId);
        const isActiveRoom = roomId === activeRoomId;
        const isOpenAndVisible = isActiveRoom && document.hidden === false;

        conversation.messages.push({
            ...message,
            read: isOpenAndVisible,
        });
        conversation.lastMessageAt = message.createdAt;

        if (!isOpenAndVisible) {
            conversation.unread = message.senderId !== currentUserId;
        }

        updateRoomPreview(roomId, message);

        if (isActiveRoom) {
            renderConversation(roomId, { markRead: isOpenAndVisible });
        }
    }

    function updateRoom(room) {
        const normalizedRoom = {
            ...room,
            memberIds: room.memberIds.map(String),
        };
        roomsById.set(String(room.id), normalizedRoom);

        const isCurrentUserMember = normalizedRoom.memberIds.includes(currentUserId);
        const $room = ensureRoomListItem(normalizedRoom);
        $room.toggle(isCurrentUserMember);
        $room.find('.avatar').first().text(getRoomInitials(normalizedRoom));
        $room.find('.contact-name').text(normalizedRoom.name);

        if (String(room.id) === activeRoomId) {
            if (isCurrentUserMember) {
                renderConversation(activeRoomId);
            } else {
                activeRoomId = $('.contact-item:visible').first().data('room')?.toString() || '';
                if (activeRoomId) {
                    renderConversation(activeRoomId);
                }
            }
        }
    }

    function createRoom(room) {
        const normalizedRoom = {
            ...room,
            memberIds: room.memberIds.map(String),
        };
        roomsById.set(String(room.id), normalizedRoom);

        const isCurrentUserMember = normalizedRoom.memberIds.includes(currentUserId);
        const $room = ensureRoomListItem(normalizedRoom);
        $room.toggle(isCurrentUserMember);

        if (isCurrentUserMember) {
            renderConversation(normalizedRoom.id);
        }
    }

    socket.on('connect', function() {
        socket.emit('joinChat', { userId: currentUserId });
    });

    socket.on('chatMessage', receiveMessage);
    socket.on('roomUpdated', updateRoom);
    socket.on('roomCreated', createRoom);

    $('#roomList').on('click', '.contact-item', function() {
        renderConversation($(this).data('room'));
    });

    $('#newRoomButton').on('click', openNewRoomModal);
    $('#closeNewRoomBtn, #cancelNewRoomBtn').on('click', closeNewRoomModal);

    $('#newRoomForm').on('submit', function(event) {
        event.preventDefault();

        const roomName = $('#roomName').val().trim();
        const memberIds = $('#newRoomForm input[name="memberIds[]"]:checked')
            .map((_, checkbox) => String($(checkbox).val()))
            .get();

        if (roomName === '') {
            $('#newRoomError').text('Room name is required.').show();
            return;
        }

        socket.emit('createRoom', {
            name: roomName,
            creatorId: currentUserId,
            memberIds,
        }, function(response) {
            if (!response || response.status !== true) {
                $('#newRoomError').text(response?.error?.message || 'Room was not created.').show();
                return;
            }

            closeNewRoomModal();
            createRoom(response.room);
        });
    });

    $('#roomMembers').on('click', '.add-member-button', function() {
        renderAddMemberMenu(roomsById.get(activeRoomId));
    });

    $('#roomMembers').on('click', '.add-member-menu button', function() {
        socket.emit('addRoomMember', {
            roomId: activeRoomId,
            userId: String($(this).data('user-id')),
        }, function(response) {
            if (!response || response.status !== true) {
                alert(response?.error?.message || 'Member was not added.');
            }
            $('.add-member-menu').remove();
        });
    });

    $('#roomMembers').on('click', '.member-avatar.can-remove', function() {
        socket.emit('removeRoomMember', {
            roomId: activeRoomId,
            userId: String($(this).data('user-id')),
        }, function(response) {
            if (!response || response.status !== true) {
                alert(response?.error?.message || 'Member was not removed.');
            }
        });
    });

    $(document).on('click', function(event) {
        if (!$(event.target).closest('#roomMembers').length) {
            $('.add-member-menu').remove();
        }
    });

    $(document).on('visibilitychange', function() {
        if (document.hidden === false && activeRoomId) {
            renderConversation(activeRoomId);
        }
    });

    $('#burgerBtn').on('click', function() {
        $('.sidebar').toggleClass('active');
    });

    $('#chatForm').on('submit', function(event) {
        event.preventDefault();

        const text = $('#messageInput').val().trim();
        if (text === '' || !activeRoomId) return;

        socket.emit('sendMessage', {
            senderId: currentUserId,
            roomId: activeRoomId,
            text,
        }, function(response) {
            if (!response || response.status !== true) {
                alert(response?.error?.message || 'Message was not sent.');
                return;
            }

            $('#messageInput').val('');
        });
    });

    if (activeRoomId) {
        renderConversation(activeRoomId);
    }
});
