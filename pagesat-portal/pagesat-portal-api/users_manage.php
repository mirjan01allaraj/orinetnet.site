<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_role('admin');

$in = read_json();
$action = trim((string)($in['action'] ?? ''));

$pdo = db();

function clean_username(string $s): string {
  $s = trim($s);
  $s = preg_replace('/\s+/', '', $s);
  return $s;
}
function clean_point(string $s): string {
  $s = trim($s);
  $s = preg_replace('/\s+/', ' ', $s);
  return $s;
}
function active_admin_count(PDO $pdo): int {
  $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role='admin' AND is_active=1");
  $row = $stmt->fetch();
  return (int)($row['c'] ?? 0);
}

try {
  if ($action === 'list') {
    $stmt = $pdo->query("SELECT id, username, role, point_name, is_active, created_at FROM users ORDER BY role='admin' DESC, point_name ASC, username ASC");
    json_out(['ok'=>true,'users'=>$stmt->fetchAll()]);
  }

  if ($action === 'list_points') {
    $stmt = $pdo->query("SELECT DISTINCT point_name FROM users ORDER BY point_name ASC");
    $points = array_map(fn($r)=>$r['point_name'], $stmt->fetchAll());
    json_out(['ok'=>true,'points'=>$points]);
  }

  if ($action === 'create') {
    $username = clean_username((string)($in['username'] ?? ''));
    $password = (string)($in['password'] ?? '');
    $role = (string)($in['role'] ?? 'point');
    $point = clean_point((string)($in['point_name'] ?? ''));

    if ($username === '' || $password === '' || $point === '') json_out(['ok'=>false,'error'=>'MISSING_FIELDS'], 400);
    if (!in_array($role, ['point','admin'], true)) json_out(['ok'=>false,'error'=>'INVALID_ROLE'], 400);

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, point_name, is_active) VALUES (?, ?, ?, ?, 1)");
    $stmt->execute([$username, $hash, $role, $point]);

    json_out(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
  }

  if ($action === 'set_active') {
    $id = (int)($in['id'] ?? 0);
    $is_active = (int)($in['is_active'] ?? -1);
    if ($id<=0 || !in_array($is_active, [0,1], true)) json_out(['ok'=>false,'error'=>'INVALID_INPUT'], 400);

    $stmt = $pdo->prepare("SELECT role FROM users WHERE id=? LIMIT 1");
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    if (!$u) json_out(['ok'=>false,'error'=>'NOT_FOUND'], 404);

    if ($u['role'] === 'admin' && $is_active === 0) {
      if (active_admin_count($pdo) <= 1) json_out(['ok'=>false,'error'=>'CANNOT_DISABLE_LAST_ADMIN'], 409);
    }

    $stmt = $pdo->prepare("UPDATE users SET is_active=? WHERE id=?");
    $stmt->execute([$is_active, $id]);
    json_out(['ok'=>true]);
  }

  if ($action === 'reset_password') {
    $id = (int)($in['id'] ?? 0);
    if ($id<=0) json_out(['ok'=>false,'error'=>'INVALID_ID'], 400);

    $temp = 'ON-' . strtoupper(bin2hex(random_bytes(4)));
    $hash = password_hash($temp, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?");
    $stmt->execute([$hash, $id]);
    json_out(['ok'=>true,'temp_password'=>$temp]);
  }

  // ✅ NEW: delete point user only if disabled (is_active = 0)
  if ($action === 'delete_user') {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) json_out(['ok'=>false,'error'=>'INVALID_ID'], 400);

    // current logged in admin
    $current = require_auth();

    // don't allow deleting yourself
    if ((int)$current['id'] === $id) {
      json_out(['ok'=>false,'error'=>'CANNOT_DELETE_SELF'], 409);
    }

    $stmt = $pdo->prepare("SELECT role, is_active FROM users WHERE id=? LIMIT 1");
    $stmt->execute([$id]);
    $userRow = $stmt->fetch();

    if (!$userRow) json_out(['ok'=>false,'error'=>'NOT_FOUND'], 404);

    // only point users can be deleted
    if (($userRow['role'] ?? '') !== 'point') {
      json_out(['ok'=>false,'error'=>'ONLY_POINT_CAN_BE_DELETED'], 403);
    }

    // must be disabled first
    if ((int)($userRow['is_active'] ?? 1) !== 0) {
      json_out(['ok'=>false,'error'=>'USER_NOT_DISABLED'], 409);
    }

    $del = $pdo->prepare("DELETE FROM users WHERE id=? LIMIT 1");
    $del->execute([$id]);

    json_out(['ok'=>true]);
  }

  json_out(['ok'=>false,'error'=>'UNKNOWN_ACTION'], 400);

} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'username')) json_out(['ok'=>false,'error'=>'USERNAME_EXISTS'], 409);
  json_out(['ok'=>false,'error'=>'DB_ERROR'], 500);
} catch (Throwable $e) {
  json_out(['ok'=>false,'error'=>'SERVER_ERROR'], 500);
}