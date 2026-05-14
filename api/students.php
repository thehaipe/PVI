<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

define('APP_BOOTSTRAP', true);
require __DIR__ . '/config.php';

function sendJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function validateStudent(array $student, array $groups, array $genders): ?array
{
    $requiredFields = ['group', 'firstName', 'lastName', 'gender', 'birthday', 'status'];
    foreach ($requiredFields as $field) {
        if (!array_key_exists($field, $student) || $student[$field] === '' || $student[$field] === null) {
            return ['code' => 100, 'message' => "Field '{$field}' is required"];
        }
    }

    if (!array_key_exists($student['group'], $groups)) {
        return ['code' => 101, 'message' => 'Invalid group value'];
    }

    if (!is_bool($student['gender'])) {
        return ['code' => 102, 'message' => 'Invalid gender value'];
    }

    if (!is_bool($student['status'])) {
        return ['code' => 103, 'message' => 'Invalid status value'];
    }

    $date = DateTime::createFromFormat('Y-m-d', $student['birthday']);
    if (!$date || $date->format('Y-m-d') !== $student['birthday']) {
        return ['code' => 104, 'message' => 'Invalid birthday format'];
    }

    return null;
}

function normalizeBooleanValue(mixed $value): ?bool
{
    if (is_bool($value)) {
        return $value;
    }

    $normalized = strtolower(trim((string) $value));

    if (in_array($normalized, ['1', 'true'], true)) {
        return true;
    }

    if (in_array($normalized, ['0', 'false'], true)) {
        return false;
    }

    return null;
}

function normalizeStudentInput(array $input): array
{
    return [
        'group'     => trim((string) ($input['group']     ?? '')),
        'firstName' => trim((string) ($input['firstName'] ?? '')),
        'lastName'  => trim((string) ($input['lastName']  ?? '')),
        'gender'    => normalizeBooleanValue($input['gender'] ?? null),
        'birthday'  => trim((string) ($input['birthday']  ?? '')),
        'status'    => normalizeBooleanValue($input['status'] ?? null),
    ];
}

function rowToStudent(array $row): array
{
    return [
        'id'        => (int) $row['id'],
        'group'     => $row['group'],
        'firstName' => $row['firstName'],
        'lastName'  => $row['lastName'],
        'gender'    => (bool) $row['gender'],
        'birthday'  => $row['birthday'],
        'status'    => (bool) $row['status'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = getDb();
} catch (PDOException $e) {
    sendJson([
        'status' => false,
        'error'  => ['code' => 500, 'message' => 'Database connection failed: ' . $e->getMessage()],
    ], 500);
}

if ($method === 'GET') {
    $stmt = $db->query('SELECT * FROM students ORDER BY id');
    $rows = $stmt->fetchAll();
    sendJson([
        'status' => true,
        'error'  => null,
        'users'  => array_map('rowToStudent', $rows),
    ]);
}

if ($method !== 'POST') {
    sendJson([
        'status' => false,
        'error'  => ['code' => 105, 'message' => 'Method not allowed'],
    ], 405);
}

$action = (string) ($_POST['action'] ?? '');

if ($action === 'create') {
    $student = normalizeStudentInput($_POST);
    $error   = validateStudent($student, $groups, $genders);

    if ($error !== null) {
        sendJson(['status' => false, 'error' => $error], 422);
    }

    $stmt = $db->prepare(
        'INSERT INTO students (`group`, firstName, lastName, gender, birthday, status)
         VALUES (:group, :firstName, :lastName, :gender, :birthday, :status)'
    );
    $stmt->execute([
        ':group'     => $student['group'],
        ':firstName' => $student['firstName'],
        ':lastName'  => $student['lastName'],
        ':gender'    => (int) $student['gender'],
        ':birthday'  => $student['birthday'],
        ':status'    => (int) $student['status'],
    ]);

    $newId           = (int) $db->lastInsertId();
    $student['id']   = $newId;

    sendJson([
        'status' => true,
        'error'  => null,
        'id'     => $newId,
        'user'   => $student,
    ]);
}

if ($action === 'update') {
    $studentId = (int) ($_POST['id'] ?? 0);

    $check = $db->prepare('SELECT id FROM students WHERE id = :id');
    $check->execute([':id' => $studentId]);
    if (!$check->fetch()) {
        sendJson([
            'status' => false,
            'error'  => ['code' => 107, 'message' => 'Not found student'],
        ], 404);
    }

    $student = normalizeStudentInput($_POST);
    $error   = validateStudent($student, $groups, $genders);

    if ($error !== null) {
        sendJson(['status' => false, 'error' => $error], 422);
    }

    $stmt = $db->prepare(
        'UPDATE students
         SET `group` = :group, firstName = :firstName, lastName = :lastName,
             gender = :gender, birthday = :birthday, status = :status
         WHERE id = :id'
    );
    $stmt->execute([
        ':group'     => $student['group'],
        ':firstName' => $student['firstName'],
        ':lastName'  => $student['lastName'],
        ':gender'    => (int) $student['gender'],
        ':birthday'  => $student['birthday'],
        ':status'    => (int) $student['status'],
        ':id'        => $studentId,
    ]);

    $student['id'] = $studentId;

    sendJson([
        'status' => true,
        'error'  => null,
        'user'   => $student,
    ]);
}

if ($action === 'delete') {
    $ids = $_POST['ids'] ?? [];
    if (!is_array($ids) || $ids === []) {
        sendJson([
            'status' => false,
            'error'  => ['code' => 109, 'message' => 'No students selected for deletion'],
        ], 422);
    }

    $idsToDelete  = array_map('intval', $ids);
    $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));

    $check = $db->prepare("SELECT COUNT(*) FROM students WHERE id IN ({$placeholders})");
    $check->execute($idsToDelete);
    if ((int) $check->fetchColumn() === 0) {
        sendJson([
            'status' => false,
            'error'  => ['code' => 110, 'message' => 'Not found student'],
        ], 404);
    }

    $stmt = $db->prepare("DELETE FROM students WHERE id IN ({$placeholders})");
    $stmt->execute($idsToDelete);

    sendJson([
        'status'     => true,
        'error'      => null,
        'deletedIds' => $idsToDelete,
    ]);
}

sendJson([
    'status' => false,
    'error'  => ['code' => 112, 'message' => 'Unknown action'],
], 400);
