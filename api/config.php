<?php

declare(strict_types=1);

// ── App dictionaries ──────────────────────────────────────────────────────────

$groups = [
    '1' => 'PZ-21',
    '2' => 'PZ-22',
    '3' => 'PZ-23',
];

$genders = [
    '1' => 'Male',
    '0' => 'Female',
];

// ── Database (PDO) ────────────────────────────────────────────────────────────

define('DB_HOST', 'localhost');
define('DB_NAME', 'pvi_students');
define('DB_USER', 'root');
define('DB_PASS', '');

function getDb(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    return $pdo;
}

// ── Stand-alone endpoint ──────────────────────────────────────────────────────

if (!defined('APP_BOOTSTRAP')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status'  => true,
        'groups'  => $groups,
        'genders' => $genders,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
