let students = [];
const STUDENTS_API_URL = 'api/students.php';

if ('serviceWorker' in navigator) {
    $(window).on('load', function() {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            registrations.forEach(function(registration) {
                registration.unregister();
            });
        });

        if ('caches' in window) {
            caches.keys().then(function(cacheNames) {
                cacheNames.forEach(function(cacheName) {
                    caches.delete(cacheName);
                });
            });
        }
    });
}

class StudentFormManager {
    constructor({ onStudentSaved }) {
        this.onStudentSaved = onStudentSaved;
        this.$userModal = $('#userModal');
        this.$userForm = $('#userForm');
        this.$modalTitle = $('#modalTitle');
        this.$submitBtn = $('#submitBtn');
        this.$formError = $('#formError');
        this.$editStudentId = $('#editStudentId');
        this.$studentId = $('#studentId');
    }

    init() {
        this.$userForm.on('submit', (event) => this.handleFormSubmit(event));
    }

    openCreateModal() {
        this.$modalTitle.text('Add student');
        this.$submitBtn.text('Create');
        this.$userForm[0].reset();
        this.$editStudentId.val('');
        this.$studentId.val('');
        $('#status').val('inactive');
        this.clearFormError();
        this.$userModal.show();
    }

    openEditModal(student) {
        if (!student) return;

        this.$modalTitle.text('Edit student');
        this.$submitBtn.text('Save');
        this.$editStudentId.val(student.id);
        this.$studentId.val(student.id);
        $('#group').val(student.group);
        $('#firstName').val(student.firstName);
        $('#lastName').val(student.lastName);
        $('#gender').val(student.gender);
        $('#birthday').val(student.birthday);
        $('#status').val(student.status || 'active');
        this.clearFormError();
        this.$userModal.show();
    }

    closeModal() {
        this.$userModal.hide();
        this.clearFormError();
    }

    showFormError(message) {
        this.$formError.text(message).show();
    }

    clearFormError() {
        this.$formError.text('').hide();
    }

    serializeForm() {
        const formData = {};
        this.$userForm.serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });

        return formData;
    }

    validateFormData(formData) {
        const requiredFields = ['group', 'firstName', 'lastName', 'gender', 'birthday', 'status'];
        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');

        if (missingFields.length > 0) {
            this.showFormError(`Please fill in all required fields: ${missingFields.join(', ')}`);
            return false;
        }

        return true;
    }

    buildFormPayload(formData) {
        const editStudentId = this.$editStudentId.val();
        const payload = { ...formData, action: editStudentId ? 'update' : 'create' };

        if (editStudentId) {
            payload.id = editStudentId;
        }

        return payload;
    }

    saveStudent(formData) {
        return $.ajax({
            url: STUDENTS_API_URL,
            method: 'POST',
            dataType: 'json',
            data: formData
        });
    }

    handleFormSubmit(event) {
        event.preventDefault();

        const serializedData = this.$userForm.serialize();
        console.log('Data to be sent to server:', serializedData);

        const formData = this.serializeForm();
        if (!this.validateFormData(formData)) return;

        const payload = this.buildFormPayload(formData);
        this.clearFormError();

        this.saveStudent(payload).done((response) => {
            if (!response.status) {
                this.showFormError(response.error?.message || 'Failed to save student');
                return;
            }

            if (response.user) {
                this.onStudentSaved(response.user);
            }

            this.$userForm[0].reset();
            this.$editStudentId.val('');
            this.$studentId.val('');
            this.closeModal();
        }).fail((xhr) => {
            const response = xhr.responseJSON;
            this.showFormError(response?.error?.message || 'Failed to save student on the server.');
        });
    }
}

class StudentManager {
    constructor() {
        this.$userTableBody = $('#userTableBody');
        this.$userModal = $('#userModal');
        this.$deleteModal = $('#deleteModal');
        this.$selectAllStudents = $('#selectAllStudents');
        this.$deleteSelectedBtn = $('#deleteSelectedBtn');
        this.$globalSearch = $('#globalSearch');
        this.$deleteMessage = $('#deleteMessage');

        this.pendingDeleteIds = [];
        this.currentTableData = students;
        this.selectedStudentIds = new Set();
        this.formManager = new StudentFormManager({
            onStudentSaved: (student) => {
                this.upsertStudent(student);
                this.applyFiltersAndRender();
            }
        });
    }

    init() {
        if (!this.$userTableBody.length) return;

        this.formManager.init();
        this.bindEvents();
        this.loadStudents();
    }

    bindEvents() {
        $('#addUserBtn').on('click', () => this.formManager.openCreateModal());
        $('.close-btn, .cancel-btn').on('click', () => this.closeModals());
        $('#closeDeleteBtn, #cancelDeleteBtn').on('click', () => this.resetPendingDelete());
        $('#confirmDeleteBtn').on('click', () => this.confirmDelete());
        this.$deleteSelectedBtn.on('click', () => this.handleBulkDeleteClick());
        this.$selectAllStudents.on('change', () => this.toggleSelectAll());
        this.$globalSearch.on('input', () => this.applyFiltersAndRender());
        $('#burgerBtn').on('click', function() {
            $('.sidebar').toggleClass('active');
        });

        this.$userTableBody.on('click', '.btn-edit', (event) => {
            this.formManager.openEditModal(this.getStudentById($(event.currentTarget).data('student-id')));
        });

        this.$userTableBody.on('click', '.btn-delete', (event) => {
            const studentId = String($(event.currentTarget).data('student-id'));
            if (!this.selectedStudentIds.has(studentId)) return;
            this.openDeleteModal([studentId]);
        });

        this.$userTableBody.on('change', '.student-checkbox', (event) => {
            this.toggleStudentSelection($(event.currentTarget));
        });

        $(window).on('click', (event) => this.handleOutsideClick(event));
    }

    getStudentById(studentId) {
        return students.find(student => String(student.id) === String(studentId)) || null;
    }

    getFilteredStudents() {
        const query = (this.$globalSearch.val() || '').toLowerCase().trim();
        if (!query) return students;

        return students.filter(function(student) {
            return student.firstName.toLowerCase().includes(query) ||
                student.lastName.toLowerCase().includes(query) ||
                student.group.toLowerCase().includes(query);
        });
    }

    applyFiltersAndRender() {
        this.renderTable(this.getFilteredStudents());
    }

    loadStudents() {
        return $.ajax({
            url: STUDENTS_API_URL,
            method: 'GET',
            dataType: 'json'
        }).done((response) => {
            if (!response.status) {
                alert(response.error?.message || 'Failed to load students');
                return;
            }

            students = Array.isArray(response.users) ? response.users : [];
            this.applyFiltersAndRender();
        }).fail(() => {
            alert('Failed to load students from the server.');
        });
    }

    deleteStudents(studentIds) {
        return $.ajax({
            url: STUDENTS_API_URL,
            method: 'POST',
            dataType: 'json',
            data: {
                action: 'delete',
                ids: studentIds
            }
        });
    }

    syncSelectAllCheckbox(data = this.currentTableData) {
        if (!this.$selectAllStudents.length) return;

        const visibleStudentIds = data.map(student => String(student.id));
        const selectedVisibleCount = visibleStudentIds.filter(studentId => this.selectedStudentIds.has(studentId)).length;
        const hasVisibleRows = visibleStudentIds.length > 0;
        const allVisibleSelected = hasVisibleRows && selectedVisibleCount === visibleStudentIds.length;

        this.$selectAllStudents
            .prop('checked', allVisibleSelected)
            .prop('indeterminate', selectedVisibleCount > 0 && !allVisibleSelected);
    }

    syncDeleteControls() {
        const hasSelection = this.selectedStudentIds.size > 0;
        this.$deleteSelectedBtn.prop('disabled', !hasSelection);

        this.$userTableBody.find('.btn-delete').each((_, button) => {
            const studentId = String($(button).data('student-id'));
            $(button).prop('disabled', !this.selectedStudentIds.has(studentId));
        });
    }

    renderTable(data = students) {
        this.currentTableData = data;
        this.$userTableBody.empty();

        data.forEach((student) => {
            const studentId = String(student.id);
            const statusClass = student.status === 'active' ? 'status-active' : 'status-inactive';
            const isChecked = this.selectedStudentIds.has(studentId) ? 'checked' : '';
            const rowClass = this.selectedStudentIds.has(studentId) ? 'selected-row' : '';
            const isDeleteDisabled = this.selectedStudentIds.has(studentId) ? '' : 'disabled';

            this.$userTableBody.append(`
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
            `);
        });

        this.syncSelectAllCheckbox(data);
        this.syncDeleteControls();
    }

    openDeleteModal(studentIds) {
        this.pendingDeleteIds = studentIds
            .map(studentId => String(studentId))
            .filter(studentId => this.getStudentById(studentId) !== null);

        if (!this.pendingDeleteIds.length) return;

        if (this.pendingDeleteIds.length === 1) {
            const student = this.getStudentById(this.pendingDeleteIds[0]);
            if (!student) return;
            this.$deleteMessage.text(`Are you sure you want to delete student ${student.firstName} ${student.lastName}?`);
        } else {
            this.$deleteMessage.text(`Are you sure you want to delete ${this.pendingDeleteIds.length} selected students?`);
        }

        this.$deleteModal.show();
    }

    closeModals() {
        this.formManager.closeModal();
        this.$deleteModal.hide();
    }

    resetPendingDelete() {
        this.pendingDeleteIds = [];
    }

    toggleStudentSelection($checkbox) {
        const studentId = String($checkbox.data('student-id'));

        if ($checkbox.is(':checked')) {
            this.selectedStudentIds.add(studentId);
        } else {
            this.selectedStudentIds.delete(studentId);
        }

        $checkbox.closest('tr').toggleClass('selected-row', $checkbox.is(':checked'));
        this.syncSelectAllCheckbox();
        this.syncDeleteControls();
    }

    toggleSelectAll() {
        const shouldSelectAll = this.$selectAllStudents.is(':checked');

        this.currentTableData.forEach(student => {
            const studentId = String(student.id);
            if (shouldSelectAll) {
                this.selectedStudentIds.add(studentId);
            } else {
                this.selectedStudentIds.delete(studentId);
            }
        });

        this.renderTable(this.currentTableData);
    }

    handleBulkDeleteClick() {
        if (!this.selectedStudentIds.size) return;
        this.openDeleteModal(Array.from(this.selectedStudentIds));
    }

    confirmDelete() {
        if (!this.pendingDeleteIds.length) return;

        this.deleteStudents(this.pendingDeleteIds).done((response) => {
            if (!response.status) {
                alert(response.error?.message || 'Failed to delete students');
                return;
            }

            const deletedIds = Array.isArray(response.deletedIds)
                ? response.deletedIds.map(id => String(id))
                : this.pendingDeleteIds;

            students = students.filter(student => !deletedIds.includes(String(student.id)));
            deletedIds.forEach(studentId => this.selectedStudentIds.delete(studentId));
            this.pendingDeleteIds = [];
            this.$deleteModal.hide();
            this.applyFiltersAndRender();
        }).fail(() => {
            alert('Failed to delete students on the server.');
        });
    }

    upsertStudent(student) {
        const existingIndex = students.findIndex(item => String(item.id) === String(student.id));

        if (existingIndex === -1) {
            students.push(student);
            return;
        }

        students[existingIndex] = student;
    }

    handleOutsideClick(event) {
        if ($(event.target).is(this.$userModal)) {
            this.formManager.closeModal();
        }

        if ($(event.target).is(this.$deleteModal)) {
            this.$deleteModal.hide();
            this.resetPendingDelete();
        }
    }
}

$(document).ready(function() {
    new StudentManager().init();
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
