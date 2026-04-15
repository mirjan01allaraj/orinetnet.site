<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

function start_session(): void {
  if (session_status() === PHP_SESSION_NONE) {

    $is_https =
      (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    session_name(SESSION_NAME);
    session_set_cookie_params([
      'lifetime' => 0,
      'path' => '/',              // keep
      // REMOVE domain to avoid duplicate/old cookies issues
      // 'domain' => 'orientnet.al',
      'secure' => $is_https,      // IMPORTANT
      'httponly' => true,
      'samesite' => 'Lax',
    ]);

    session_start();
  }
}

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');

  // IMPORTANT: prevent caching anywhere (browser / proxy / CDN)
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');

  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function require_auth(): array {
  start_session();

  if (!isset($_SESSION['user'])) {
    session_write_close();
    json_out(['ok' => false, 'error' => 'UNAUTHORIZED'], 401);
  }

  $u = $_SESSION['user'];
  session_write_close();   // <---- Important
  return $u;
}

function require_role(string $role): array {
  $u = require_auth();
  if (($u['role'] ?? '') !== $role) {
    json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
  }
  return $u;
}

function read_json(): array {
  $raw = file_get_contents('php://input') ?: '';
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}
