<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

start_session();

if (!isset($_SESSION['user'])) {
  session_write_close();
  json_out(['ok'=>false,'error'=>'UNAUTHORIZED'],401);
}

$u = $_SESSION['user'];
session_write_close();

json_out(['ok'=>true,'user'=>$u]);