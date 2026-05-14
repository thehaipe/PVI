DROP DATABASE IF EXISTS pvi_students;

CREATE DATABASE IF NOT EXISTS pvi_students
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE pvi_students;

CREATE TABLE IF NOT EXISTS students (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    `group`   VARCHAR(10)                  NOT NULL,
    firstName VARCHAR(100)                 NOT NULL,
    lastName  VARCHAR(100)                 NOT NULL,
    gender    BOOLEAN                      NOT NULL,
    birthday  DATE                         NOT NULL,
    status    BOOLEAN                      NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
