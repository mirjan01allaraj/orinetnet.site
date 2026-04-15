<?php
declare(strict_types=1);

define('DB_HOST', 'localhost');
define('DB_NAME', 'u115447657_ON_pagesat');
define('DB_USER', 'u115447657_ON_pagesat');
define('DB_PASS', 'ON_pagesat1');  // your real DB password

define('SESSION_NAME', 'on_pagesat_sess');

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
  $pdo = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
