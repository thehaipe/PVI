<?php
declare(strict_types=1);

define('APP_BOOTSTRAP', true);
require __DIR__ . '/api/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PVI - User Management</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#ff4d4d">
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <h2>CRM System</h2>
            </div>
            <nav>
                <ul>
                    <li><a href="dashboard.html">Dashboard</a></li>
                    <li><a href="index.php" class="active">Students</a></li>
                    <li><a href="tasks.html">Tasks</a></li>
                </ul>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <header>
                <div class="header-left">
                    <button id="burgerBtn" class="burger-btn">☰</button>
                    <div class="search-bar">
                        <input type="text" id="globalSearch" placeholder="Search students...">
                    </div>
                </div>
                <div class="header-actions">
                    <a href="chat.html" class="icon-btn bell-btn" title="Chat">
                        <img src="icons/bell_icon.png" alt="Notifications" class="bell-img">
                    </a>
                    <div class="profile-container">
                        <div class="avatar avatar-md">
                            <img src="icons/avatar_icon.png" alt="Profile">
                        </div>
                        <span class="profile-name">James Bond</span>
                        <div class="profile-dropdown">
                            <a href="#" class="dropdown-item">Profile</a>
                            <a href="#" class="dropdown-item">Log Out</a>
                        </div>
                    </div>
                </div>
            </header>

            <section class="content-header">
                <h1>Students</h1>
                <button id="addUserBtn" class="btn-add-square">+</button>
            </section>

            <section class="table-container">
                <div class="table-wrapper">
                    <table id="userTable">
                        <thead>
                            <tr>
                                <th>Group</th>
                                <th>Name</th>
                                <th>Gender</th>
                                <th>Birthday</th>
                                <th>Status</th>
                                <th>Options</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                            <!-- Students injected by JS -->
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>

    <!-- Modal for Add/Edit Student -->
    <div id="userModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add student</h2>
                <button class="close-btn" type="button">×</button>
            </div>
            <div class="modal-body">
                <form id="userForm">
                    <input type="hidden" id="studentId" name="id">
                    <input type="hidden" id="editStudentId">
                    <div class="form-row">
                        <label for="group">Group</label>
                        <div class="input-wrapper">
                            <select id="group" name="group" required>
                                <option value="" disabled selected>Select Group</option>
                                <?php foreach ($config['groups'] as $id => $name): ?>
                                    <option value="<?= htmlspecialchars($id) ?>"><?= htmlspecialchars($name) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="firstName">First name</label>
                        <div class="input-wrapper">
                            <input type="text" id="firstName" name="firstName" required placeholder="First name">
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="lastName">Last name</label>
                        <div class="input-wrapper">
                            <input type="text" id="lastName" name="lastName" required placeholder="Last name">
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="gender">Gender</label>
                        <div class="input-wrapper">
                            <select id="gender" name="gender" required>
                                <option value="" disabled selected>Select Gender</option>
                                <?php foreach ($config['genders'] as $id => $name): ?>
                                    <option value="<?= htmlspecialchars($id) ?>"><?= htmlspecialchars($name) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="birthday">Birthday</label>
                        <div class="input-wrapper">
                            <input type="date" id="birthday" name="birthday" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="status">Status</label>
                        <div class="input-wrapper">
                            <select id="status" name="status" required>
                                <option value="active">Active</option>
                                <option value="inactive" selected>Inactive</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                <button type="submit" form="userForm" id="submitBtn" class="btn btn-primary">Create</button>
            </div>
        </div>
    </div>

    <!-- Modal for Delete Confirmation -->
    <div id="deleteModal" class="modal">
        <div class="modal-content delete-modal-content">
            <div class="modal-header">
                <h2>Warning</h2>
                <button class="close-btn" id="closeDeleteBtn">&times;</button>
            </div>
            <div class="modal-body">
                <p id="deleteMessage">Are you sure you want to delete this student?</p>
            </div>
            <div class="modal-footer">
                <button id="cancelDeleteBtn" class="btn btn-secondary">Cancel</button>
                <button id="confirmDeleteBtn" class="btn btn-delete">Ok</button>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="js/script.js"></script>
</body>
</html>
