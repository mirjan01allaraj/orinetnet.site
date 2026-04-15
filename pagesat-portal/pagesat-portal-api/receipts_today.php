<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
$u = require_auth();

$today = (new DateTime('now', new DateTimeZone('Europe/Tirane')))->format('Y-m-d');
$pdo = db();

if ($u['role'] === 'admin') {
  $stmt = $pdo->prepare("
    SELECT p.id, p.receipt_no, p.created_at, p.point_name,
           CONCAT(c.first_name,' ',c.last_name) AS customer_name,
           c.phone AS customer_phone,
           p.package_code, p.months_selected, p.amount_paid, p.reason, p.note
    FROM payments p
    JOIN customers c ON c.id=p.customer_id
    WHERE p.receipt_date=?
    ORDER BY p.id DESC
    LIMIT 200
  ");
  $stmt->execute([$today]);
} else {
  $stmt = $pdo->prepare("
    SELECT p.id, p.receipt_no, p.created_at, p.point_name,
           CONCAT(c.first_name,' ',c.last_name) AS customer_name,
           c.phone AS customer_phone,
           p.package_code, p.months_selected, p.amount_paid, p.reason, p.note
    FROM payments p
    JOIN customers c ON c.id=p.customer_id
    WHERE p.receipt_date=? AND p.point_name=?
    ORDER BY p.id DESC
    LIMIT 200
  ");
  $stmt->execute([$today, $u['point_name']]);
}

$rows = $stmt->fetchAll();
$total = array_sum(array_map(fn($r)=>(int)$r['amount_paid'], $rows));
json_out(['ok'=>true,'date'=>$today,'total'=>$total,'receipts'=>$rows]);
