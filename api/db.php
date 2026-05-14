<?php

declare(strict_types=1);

$dbHost = 'localhost';
$dbName = 'pvi_students';
$dbUser = 'root';
$dbPass = '';

function getDb(): PDO
{
    global $dbHost, $dbName, $dbUser, $dbPass;
    static $pdo = null;

    if ($pdo === null) {
        $pdo = new PDO(
            "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
            $dbUser,
            $dbPass
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    return $pdo;
}
