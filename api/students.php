<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataFile = dirname(__DIR__) . '/data/students.json';

function sendJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readStudents(string $dataFile): array
{
    if (!file_exists($dataFile)) {
        return [];
    }

    $contents = file_get_contents($dataFile);
    if ($contents === false || $contents === '') {
        return [];
    }

    $students = json_decode($contents, true);
    return is_array($students) ? $students : [];
}

function writeStudents(string $dataFile, array $students): bool
{
    $directory = dirname($dataFile);
    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        return false;
    }

    $encoded = json_encode(array_values($students), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $encoded !== false && file_put_contents($dataFile, $encoded, LOCK_EX) !== false;
}

function normalizeStudentInput(array $input): array
{
    return [
        'group' => trim((string) ($input['group'] ?? '')),
        'firstName' => trim((string) ($input['firstName'] ?? '')),
        'lastName' => trim((string) ($input['lastName'] ?? '')),
        'gender' => trim((string) ($input['gender'] ?? '')),
        'birthday' => trim((string) ($input['birthday'] ?? '')),
        'status' => trim((string) ($input['status'] ?? '')),
    ];
}

function validateStudent(array $student): ?array
{
    $requiredFields = ['group', 'firstName', 'lastName', 'gender', 'birthday', 'status'];
    foreach ($requiredFields as $field) {
        if ($student[$field] === '') {
            return ['code' => 100, 'message' => "Field '{$field}' is required"];
        }
    }

    $allowedGroups = ['PZ-21', 'PZ-22', 'PZ-23'];
    if (!in_array($student['group'], $allowedGroups, true)) {
        return ['code' => 101, 'message' => 'Invalid group value'];
    }

    $allowedGenders = ['male', 'female'];
    if (!in_array($student['gender'], $allowedGenders, true)) {
        return ['code' => 102, 'message' => 'Invalid gender value'];
    }

    $allowedStatuses = ['active', 'inactive'];
    if (!in_array($student['status'], $allowedStatuses, true)) {
        return ['code' => 103, 'message' => 'Invalid status value'];
    }

    $date = DateTime::createFromFormat('Y-m-d', $student['birthday']);
    $isValidBirthday = $date && $date->format('Y-m-d') === $student['birthday'];
    if (!$isValidBirthday) {
        return ['code' => 104, 'message' => 'Invalid birthday format'];
    }

    return null;
}

function nextStudentId(array $students): int
{
    $maxId = 0;
    foreach ($students as $student) {
        $maxId = max($maxId, (int) ($student['id'] ?? 0));
    }

    return $maxId + 1;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$students = readStudents($dataFile);

if ($method === 'GET') {
    sendJson([
        'status' => true,
        'error' => null,
        'users' => array_values($students),
    ]);
}

if ($method !== 'POST') {
    sendJson([
        'status' => false,
        'error' => ['code' => 105, 'message' => 'Method not allowed'],
    ], 405);
}

$action = (string) ($_POST['action'] ?? '');

if ($action === 'create') {
    $student = normalizeStudentInput($_POST);
    $validationError = validateStudent($student);

    if ($validationError !== null) {
        sendJson(['status' => false, 'error' => $validationError], 422);
    }

    $student['id'] = nextStudentId($students);
    $students[] = $student;

    if (!writeStudents($dataFile, $students)) {
        sendJson([
            'status' => false,
            'error' => ['code' => 106, 'message' => 'Failed to save student'],
        ], 500);
    }

    sendJson([
        'status' => true,
        'error' => null,
        'id' => $student['id'],
        'user' => $student,
    ]);
}

if ($action === 'update') {
    $studentId = (int) ($_POST['id'] ?? 0);
    $studentIndex = null;

    foreach ($students as $index => $student) {
        if ((int) ($student['id'] ?? 0) === $studentId) {
            $studentIndex = $index;
            break;
        }
    }

    if ($studentIndex === null) {
        sendJson([
            'status' => false,
            'error' => ['code' => 107, 'message' => 'Not found student'],
        ], 404);
    }

    $student = normalizeStudentInput($_POST);
    $validationError = validateStudent($student);

    if ($validationError !== null) {
        sendJson(['status' => false, 'error' => $validationError], 422);
    }

    $student['id'] = $studentId;
    $students[$studentIndex] = $student;

    if (!writeStudents($dataFile, $students)) {
        sendJson([
            'status' => false,
            'error' => ['code' => 108, 'message' => 'Failed to update student'],
        ], 500);
    }

    sendJson([
        'status' => true,
        'error' => null,
        'user' => $student,
    ]);
}

if ($action === 'delete') {
    $ids = $_POST['ids'] ?? [];
    if (!is_array($ids) || $ids === []) {
        sendJson([
            'status' => false,
            'error' => ['code' => 109, 'message' => 'No students selected for deletion'],
        ], 422);
    }

    $idsToDelete = array_map('intval', $ids);
    $filteredStudents = array_values(array_filter(
        $students,
        static fn(array $student): bool => !in_array((int) ($student['id'] ?? 0), $idsToDelete, true)
    ));

    if (count($filteredStudents) === count($students)) {
        sendJson([
            'status' => false,
            'error' => ['code' => 110, 'message' => 'Not found student'],
        ], 404);
    }

    if (!writeStudents($dataFile, $filteredStudents)) {
        sendJson([
            'status' => false,
            'error' => ['code' => 111, 'message' => 'Failed to delete students'],
        ], 500);
    }

    sendJson([
        'status' => true,
        'error' => null,
        'deletedIds' => $idsToDelete,
    ]);
}

sendJson([
    'status' => false,
    'error' => ['code' => 112, 'message' => 'Unknown action'],
], 400);
