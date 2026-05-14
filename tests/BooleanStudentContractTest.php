<?php

declare(strict_types=1);

define('APP_BOOTSTRAP', true);
require __DIR__ . '/../api/config.php';

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$sql = file_get_contents(__DIR__ . '/../data/setup.sql');

assertTrue(
    preg_match('/gender\s+BOOLEAN\s+NOT\s+NULL/i', $sql) === 1,
    'students.gender must be BOOLEAN NOT NULL'
);

assertTrue(
    preg_match('/status\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i', $sql) === 1,
    'students.status must be BOOLEAN NOT NULL DEFAULT FALSE'
);

assertTrue(($genders['1'] ?? null) === 'Male', 'gender true/1 must mean Male');
assertTrue(($genders['0'] ?? null) === 'Female', 'gender false/0 must mean Female');

echo "Boolean student contract OK\n";
