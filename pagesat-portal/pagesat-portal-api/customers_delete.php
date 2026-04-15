<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_role('admin');

$in = read_json();
$customer_id = (int)($in['customer_id'] ?? 0);
if ($customer_id <= 0) json_out(['ok'=>false,'error'=>'INVALID_ID'], 400);

$pdo = db();

try {
  // exists?
  $cs = $pdo->prepare("SELECT id FROM customers WHERE id=? LIMIT 1");
  $cs->execute([$customer_id]);
  if (!$cs->fetch()) json_out(['ok'=>false,'error'=>'NOT_FOUND'], 404);

  // block delete if has payments
  $ps = $pdo->prepare("SELECT COUNT(*) AS c FROM payments WHERE customer_id=?");
  $ps->execute([$customer_id]);
  $row = $ps->fetch();
  $cnt = (int)($row['c'] ?? 0);

  if ($cnt > 0) {
    json_out(['ok'=>false,'error'=>'HAS_PAYMENTS'], 409);
  }

  // soft delete
  $up = $pdo->prepare("UPDATE customers SET is_active=0 WHERE id=? LIMIT 1");
  $up->execute([$customer_id]);

  json_out(['ok'=>true]);

} catch (Throwable $e) {
  json_out(['ok'=>false,'error'=>'SERVER_ERROR'], 500);
}