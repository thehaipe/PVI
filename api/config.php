<?php

declare(strict_types=1);

$config = [
    'groups' => [
        'PZ-21' => 'PZ-21',
        'PZ-22' => 'PZ-22',
        'PZ-23' => 'PZ-23',
    ],
    'genders' => [
        'male'   => 'Male',
        'female' => 'Female',
    ],
];

if (!defined('APP_BOOTSTRAP')) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status'  => true,
        'groups'  => $config['groups'],
        'genders' => $config['genders'],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
