<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

$in = read_json();
$username = trim((string)($in['username'] ?? ''));
$password = (string)($in['password'] ?? '');

if ($username === '' || $password === '') json_out(['ok'=>false,'error'=>'MISSING_FIELDS'], 400);

$pdo = db();
$stmt = $pdo->prepare("SELECT id, username, password_hash, role, point_name, is_active FROM users WHERE username=? LIMIT 1");
$stmt->execute([$username]);
$u = $stmt->fetch();

if (!$u || (int)$u['is_active'] !== 1 || !password_verify($password, $u['password_hash'])) {
  json_out(['ok'=>false,'error'=>'INVALID_LOGIN'], 401);
}

start_session();
session_regenerate_id(true);

$_SESSION['user'] = [
  'id' => (int)$u['id'],
  'username' => $u['username'],
  'role' => $u['role'],
  'point_name' => $u['point_name'],
];

session_write_close();   // <---- CRITICAL

json_out(['ok'=>true, 'user'=>$_SESSION['user']]);
