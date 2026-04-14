<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

start_session();

// clear session data
$_SESSION = [];

// delete cookie variants (domain + path)
if (ini_get('session.use_cookies')) {
  $p = session_get_cookie_params();

  $name = session_name();
  $secure = $p['secure'] ?? true;
  $httponly = $p['httponly'] ?? true;

  $domains = [
    null,
    'orientnet.al',
    '.orientnet.al',
  ];

  $paths = [
    '/',
    '/pagesat',
    '/pagesat/',
    '/pagesat-api',
    '/pagesat-api/',
  ];

  foreach ($domains as $domain) {
    foreach ($paths as $path) {
      if ($domain === null) {
        setcookie($name, '', time() - 3600, $path);
        setcookie($name, '', time() - 3600, $path, '', $secure, $httponly);
      } else {
        setcookie($name, '', time() - 3600, $path, $domain, $secure, $httponly);
      }
    }
  }
}

// destroy server session
session_destroy();
session_write_close();

json_out(['ok' => true]);