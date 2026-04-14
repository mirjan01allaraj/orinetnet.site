<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
$u = require_auth();

header('Content-Type: application/json; charset=utf-8');

if (($u['role'] ?? '') !== 'admin') {
  json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
}

$pdo = db();

try {
  $stmt = $pdo->query("
    SELECT
      id,
      username,
      role,
      point_name,
      is_active
    FROM users
    ORDER BY
      CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
      username ASC
  ");

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $points = [];
  foreach ($rows as $row) {
    if ((int)($row['is_active'] ?? 1) !== 1) {
      continue;
    }

    $points[] = [
      'id' => (int)$row['id'],
      'username' => (string)$row['username'],
      'role' => (string)$row['role'],
      'point_name' => (string)($row['point_name'] ?? ''),
    ];
  }

  json_out([
    'ok' => true,
    'points' => $points,
  ]);
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'SERVER_ERROR'], 500);
}