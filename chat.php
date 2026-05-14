<?php
declare(strict_types=1);

$chatUsersPath = __DIR__ . '/data/chat-users.json';
$chatUsers = json_decode((string) file_get_contents($chatUsersPath), true);
if (!is_array($chatUsers)) {
    $chatUsers = [];
}

$chatRoomsPath = __DIR__ . '/data/chat-rooms.json';
$chatRooms = json_decode((string) file_get_contents($chatRoomsPath), true);
if (!is_array($chatRooms)) {
    $chatRooms = [];
}

$requestedUserId = (string) ($_GET['user'] ?? '1');
$currentUser = $chatUsers[0] ?? ['id' => '1', 'name' => 'James Bond', 'initials' => 'JB', 'online' => true];
foreach ($chatUsers as $chatUser) {
    if ((string) $chatUser['id'] === $requestedUserId) {
        $currentUser = $chatUser;
        break;
    }
}

$rooms = array_values(array_filter(
    $chatRooms,
    static fn(array $room): bool => in_array((string) $currentUser['id'], array_map('strval', $room['memberIds'] ?? []), true)
));
$activeRoom = $rooms[0] ?? null;

$usersById = [];
foreach ($chatUsers as $chatUser) {
    $usersById[(string) $chatUser['id']] = $chatUser;
}

function getRoomMembers(array $room, array $usersById): array
{
    $members = [];
    foreach (($room['memberIds'] ?? []) as $memberId) {
        $key = (string) $memberId;
        if (isset($usersById[$key])) {
            $members[] = $usersById[$key];
        }
    }

    return $members;
}

function getRoomInitials(array $room, array $usersById): string
{
    $members = getRoomMembers($room, $usersById);
    if ($members === []) {
        return 'R';
    }

    return (string) ($members[0]['initials'] ?? 'R');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PVI - Chat Room</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#ff4d4d">
</head>
<body>
    <div class="app-container">
        <aside class="sidebar">
            <div class="logo">
                <h2>CRM System</h2>
            </div>
            <nav>
                <ul>
                    <li><a href="dashboard.html">Dashboard</a></li>
                    <li><a href="index.php">Students</a></li>
                    <li><a href="tasks.html">Tasks</a></li>
                </ul>
            </nav>
        </aside>

        <main class="main-content chat-main">
            <header>
                <div class="header-left">
                    <button id="burgerBtn" class="burger-btn">☰</button>
                    <div class="search-bar">
                        <input type="text" id="globalSearch" placeholder="Search messages...">
                    </div>
                </div>
                <div class="header-actions">
                    <a href="chat.php?user=<?= htmlspecialchars((string) $currentUser['id']) ?>" class="icon-btn bell-btn active" title="Chat">
                        <img src="icons/bell_icon.png" alt="Notifications" class="bell-img">
                    </a>
                    <div class="profile-container">
                        <div class="avatar avatar-md"><?= htmlspecialchars((string) $currentUser['initials']) ?></div>
                        <span class="profile-name"><?= htmlspecialchars((string) $currentUser['name']) ?></span>
                        <div class="profile-dropdown">
                            <?php foreach ($chatUsers as $chatUser): ?>
                                <a href="chat.php?user=<?= htmlspecialchars((string) $chatUser['id']) ?>" class="dropdown-item">
                                    <?= htmlspecialchars((string) $chatUser['name']) ?>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </header>

            <div class="chat-container">
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <h3>Chat room</h3>
                        <button class="new-room-button" id="newRoomButton" type="button">+ New chat room</button>
                    </div>
                    <div class="contact-list" id="roomList">
                        <?php foreach ($rooms as $index => $room): ?>
                            <div class="contact-item <?= $index === 0 ? 'active' : '' ?>" data-room="<?= htmlspecialchars((string) $room['id']) ?>">
                                <div class="avatar avatar-sm"><?= htmlspecialchars(getRoomInitials($room, $usersById)) ?></div>
                                <div class="contact-info">
                                    <div class="contact-header-row">
                                        <p class="contact-name"><?= htmlspecialchars((string) $room['name']) ?></p>
                                        <span class="contact-time">--:--</span>
                                    </div>
                                    <p class="contact-last-msg">No messages yet</p>
                                </div>
                                <span class="unread-indicator" aria-label="Unread message"></span>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="chat-window" id="chatWindow">
                    <div class="chat-header">
                        <div class="avatar avatar-sm" id="activeChatAvatar">
                            <?= htmlspecialchars($activeRoom ? getRoomInitials($activeRoom, $usersById) : '') ?>
                        </div>
                        <div class="chat-contact-details">
                            <h4 id="activeChatName"><?= htmlspecialchars((string) ($activeRoom['name'] ?? 'No rooms')) ?></h4>
                            <span class="status-text" id="roomStatus"><?= count($activeRoom['memberIds'] ?? []) ?> members</span>
                        </div>
                        <div class="room-members" id="roomMembers"></div>
                    </div>
                    <div class="chat-messages" id="chatMessages"></div>
                    <form class="chat-footer" id="chatForm">
                        <input type="text" id="messageInput" name="message" placeholder="Type a message..." autocomplete="off">
                        <button class="send-button" type="submit" aria-label="Send message">
                            <img src="icons/message_send_paper_plane_icon.svg" alt="">
                        </button>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <div class="modal" id="newRoomModal">
        <div class="modal-content new-room-modal-content">
            <div class="modal-header">
                <h2>New chat room</h2>
                <button class="close-btn" id="closeNewRoomBtn" type="button">×</button>
            </div>
            <form id="newRoomForm">
                <div class="modal-body">
                    <div class="form-row">
                        <label for="roomName">Room name</label>
                        <div class="input-wrapper">
                            <input type="text" id="roomName" name="roomName" required placeholder="Room name">
                        </div>
                    </div>
                    <div class="room-user-list">
                        <?php foreach ($chatUsers as $chatUser): ?>
                            <?php if ((string) $chatUser['id'] === (string) $currentUser['id']) continue; ?>
                            <label class="room-user-option">
                                <input type="checkbox" name="memberIds[]" value="<?= htmlspecialchars((string) $chatUser['id']) ?>">
                                <span class="avatar avatar-xs"><?= htmlspecialchars((string) $chatUser['initials']) ?></span>
                                <span><?= htmlspecialchars((string) $chatUser['name']) ?></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                    <p class="form-error" id="newRoomError"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelNewRoomBtn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const CHAT_CONFIG = <?= json_encode([
            'currentUser' => $currentUser,
            'users' => $chatUsers,
            'rooms' => $rooms,
            'socketUrl' => 'http://127.0.0.1:3000',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
    </script>
    <script src="http://127.0.0.1:3000/socket.io/socket.io.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="js/script.js"></script>
    <script src="js/chat.js"></script>
</body>
</html>
