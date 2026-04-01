// Mock Data for Students Table
let students = [];

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    $(window).on('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}

$(document).ready(function() {
    const $userTableBody = $('#userTableBody');
    const $userModal = $('#userModal');
    const $deleteModal = $('#deleteModal');
    const $userForm = $('#userForm');
    const $modalTitle = $('#modalTitle');
    const $submitBtn = $('#submitBtn');
    const $selectAllStudents = $('#selectAllStudents');
    const $deleteSelectedBtn = $('#deleteSelectedBtn');
    
    let userToDeleteIndex = null;
    let pendingDeleteIds = [];
    let currentTableData = students;
    const selectedStudentIds = new Set();

    function getStudentIndexById(studentId) {
        return students.findIndex(student => String(student.id) === String(studentId));
    }

    function syncSelectAllCheckbox(data = currentTableData) {
        if (!$selectAllStudents.length) return;

        const visibleStudentIds = data.map(student => String(student.id));
        const selectedVisibleCount = visibleStudentIds.filter(studentId => selectedStudentIds.has(studentId)).length;
        const hasVisibleRows = visibleStudentIds.length > 0;
        const allVisibleSelected = hasVisibleRows && selectedVisibleCount === visibleStudentIds.length;

        $selectAllStudents
            .prop('checked', allVisibleSelected)
            .prop('indeterminate', selectedVisibleCount > 0 && !allVisibleSelected);
    }

    function syncDeleteControls() {
        const hasSelection = selectedStudentIds.size > 0;

        $deleteSelectedBtn.prop('disabled', !hasSelection);

        $userTableBody.find('.btn-delete').each(function() {
            const studentId = String($(this).data('student-id'));
            $(this).prop('disabled', !selectedStudentIds.has(studentId));
        });
    }

    // Render Table
    function renderTable(data = students) {
        if (!$userTableBody.length) return;
        currentTableData = data;
        $userTableBody.empty();
        data.forEach((student) => {
            const statusClass = student.status === 'active' ? 'status-active' : 'status-inactive';
            const studentId = String(student.id);
            const isChecked = selectedStudentIds.has(studentId) ? 'checked' : '';
            const rowClass = selectedStudentIds.has(studentId) ? 'selected-row' : '';
            const isDeleteDisabled = selectedStudentIds.has(studentId) ? '' : 'disabled';
            const tr = `
                <tr class="${rowClass}">
                    <td class="checkbox-column">
                        <input
                            type="checkbox"
                            class="student-checkbox"
                            data-student-id="${studentId}"
                            ${isChecked}
                            aria-label="Select ${student.firstName} ${student.lastName}"
                        >
                    </td>
                    <td>${student.group}</td>
                    <td>${student.firstName} ${student.lastName}</td>
                    <td>${student.gender}</td>
                    <td>${student.birthday}</td>
                    <td><span class="status-indicator ${statusClass}"></span></td>
                    <td>
                        <button class="btn-edit" type="button" data-student-id="${studentId}">✎</button>
                        <button class="btn-delete" type="button" data-student-id="${studentId}" ${isDeleteDisabled}>×</button>
                    </td>
                </tr>
            `;
            $userTableBody.append(tr);
        });
        syncSelectAllCheckbox(data);
        syncDeleteControls();
    }

    // Add User Click
    $('#addUserBtn').on('click', function() {
        $modalTitle.text("Add student");
        $submitBtn.text("Create");
        $userForm[0].reset();
        $('#editIndex').val('');
        $('#studentId').val(Date.now()); // Generate mock ID
        $('#status').val('inactive'); // Default status for new students
        $userModal.show();
    });

    // Close Modals
    $('.close-btn, .cancel-btn').on('click', function() {
        $userModal.hide();
        $deleteModal.hide();
    });

    function openEditModal(studentId) {
        const index = getStudentIndexById(studentId);
        if (index === -1) return;

        const student = students[index];
        $modalTitle.text("Edit student");
        $submitBtn.text("Save");
        $('#editIndex').val(index);
        $('#studentId').val(student.id);
        $('#group').val(student.group);
        $('#firstName').val(student.firstName);
        $('#lastName').val(student.lastName);
        $('#gender').val(student.gender);
        $('#birthday').val(student.birthday);
        $('#status').val(student.status || 'active');
        $userModal.show();
    }

    function openDeleteModal(studentIds) {
        pendingDeleteIds = studentIds
            .map(studentId => String(studentId))
            .filter(studentId => getStudentIndexById(studentId) !== -1);

        if (!pendingDeleteIds.length) return;

        if (pendingDeleteIds.length === 1) {
            userToDeleteIndex = getStudentIndexById(pendingDeleteIds[0]);
            const student = students[userToDeleteIndex];
            $('#deleteMessage').text(`Are you sure you want to delete student ${student.firstName} ${student.lastName}?`);
        } else {
            userToDeleteIndex = null;
            $('#deleteMessage').text(`Are you sure you want to delete ${pendingDeleteIds.length} selected students?`);
        }
        $deleteModal.show();
    }

    $userTableBody.on('click', '.btn-edit', function() {
        openEditModal($(this).data('student-id'));
    });

    $userTableBody.on('click', '.btn-delete', function() {
        const studentId = String($(this).data('student-id'));
        if (!selectedStudentIds.has(studentId)) return;
        openDeleteModal([studentId]);
    });

    $userTableBody.on('change', '.student-checkbox', function() {
        const studentId = String($(this).data('student-id'));

        if ($(this).is(':checked')) {
            selectedStudentIds.add(studentId);
        } else {
            selectedStudentIds.delete(studentId);
        }

        $(this).closest('tr').toggleClass('selected-row', $(this).is(':checked'));
        syncSelectAllCheckbox();
        syncDeleteControls();
    });

    $selectAllStudents.on('change', function() {
        const shouldSelectAll = $(this).is(':checked');

        currentTableData.forEach(student => {
            const studentId = String(student.id);
            if (shouldSelectAll) {
                selectedStudentIds.add(studentId);
            } else {
                selectedStudentIds.delete(studentId);
            }
        });

        renderTable(currentTableData);
    });

    $deleteSelectedBtn.on('click', function() {
        if (!selectedStudentIds.size) return;
        openDeleteModal(Array.from(selectedStudentIds));
    });

    $('#confirmDeleteBtn').on('click', function() {
        if (pendingDeleteIds.length > 0) {
            students = students.filter(student => !pendingDeleteIds.includes(String(student.id)));
            pendingDeleteIds.forEach(studentId => selectedStudentIds.delete(studentId));
            renderTable();
            $deleteModal.hide();
            userToDeleteIndex = null;
            pendingDeleteIds = [];
        }
    });

    $('#closeDeleteBtn, #cancelDeleteBtn').on('click', function() {
        pendingDeleteIds = [];
        userToDeleteIndex = null;
    });

    // Form Submit
    $userForm.on('submit', function(e) {
        e.preventDefault();

        // Form serialization as required
        const serializedData = $(this).serialize();
        console.log("Data to be sent to server:", serializedData);

        const formData = {};
        $(this).serializeArray().forEach(item => formData[item.name] = item.value);

        // Validate required fields before adding/editing
        const requiredFields = ['group', 'firstName', 'lastName', 'gender', 'birthday', 'status'];
        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
        if (missingFields.length > 0) {
            alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return;
        }

        const editIndex = $('#editIndex').val();

        if (editIndex !== '') {
            students[editIndex] = {
                ...students[editIndex],
                ...formData
            };
        } else {
            formData.id = formData.id || String(Date.now());
            students.push(formData);
        }

        $userModal.hide();
        renderTable();
    });

    // Global Search
    $('#globalSearch').on('input', function() {
        const query = $(this).val().toLowerCase();
        const filtered = students.filter(s => 
            s.firstName.toLowerCase().includes(query) || 
            s.lastName.toLowerCase().includes(query) || 
            s.group.toLowerCase().includes(query)
        );
        renderTable(filtered);
    });

    // Mobile Burger Menu
    $('#burgerBtn').on('click', function() {
        $('.sidebar').toggleClass('active');
    });

    // Initial render
    renderTable();

    // Close modal on outside click
    $(window).on('click', function(e) {
        if ($(e.target).is($userModal)) $userModal.hide();
        if ($(e.target).is($deleteModal)) {
            $deleteModal.hide();
            pendingDeleteIds = [];
            userToDeleteIndex = null;
        }
    });
});

// Mock Data for Chats (keeping it for chat.html)
const chatData = {
    'vm': { name: 'Valentyn Miedientsov', initials: 'VM', status: 'Online', messages: [
        { type: 'incoming', text: 'Hello! How is the project going?', time: '12:40' },
        { type: 'outgoing', text: "Hi Valentyn! I'm finishing the user management table right now.", time: '12:42' }
    ]},
    'jd': { name: 'John Doe', initials: 'JD', status: 'Last seen 10 mins ago', messages: [
        { type: 'incoming', text: "Hey, have you seen the new requirements?", time: '10:15' }
    ]},
    'as': { name: 'Anna Smith', initials: 'AS', status: 'Online', messages: [
        { type: 'incoming', text: "Thanks for the help with the lab!", time: 'Yesterday' }
    ]}
};

// Chat logic using jQuery
$(function() {
    $('.contact-item').on('click', function() {
        const contactId = $(this).data('contact');
        const data = chatData[contactId];
        if (!data) return;

        $('.contact-item').removeClass('active');
        $(this).addClass('active');

        $('#activeChatName').text(data.name);
        $('#activeChatAvatar').text(data.initials);
        $('.status-text').text(data.status);

        const $chatMessages = $('#chatMessages');
        $chatMessages.empty();
        data.messages.forEach(msg => {
            $chatMessages.append(`
                <div class="message ${msg.type}">
                    <div class="message-bubble">${msg.text}</div>
                    <span class="message-time">${msg.time}</span>
                </div>
            `);
        });
        $chatMessages.scrollTop($chatMessages[0].scrollHeight);
    });
});
