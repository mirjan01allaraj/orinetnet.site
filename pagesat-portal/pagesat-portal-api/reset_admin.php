<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

// SET NEW PASSWORD HERE
$newPass = 'Orient123!';

$hash = password_hash($newPass, PASSWORD_DEFAULT);

$pdo = db();
$stmt = $pdo->prepare("UPDATE users SET password_hash=? WHERE username='admin' LIMIT 1");
$stmt->execute([$hash]);

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok'=>true, 'new_password'=>$newPass], JSON_PRETTY_PRINT);