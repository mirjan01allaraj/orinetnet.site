<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_role('admin');

$date = trim((string)($_GET['date'] ?? ''));
$point = trim((string)($_GET['point'] ?? ''));
if ($date === '') $date = (new DateTime('now', new DateTimeZone('Europe/Tirane')))->format('Y-m-d');

$pdo = db();
$params = [$date];
$where = "p.receipt_date=?";
if ($point !== '') { $where .= " AND p.point_name=?"; $params[] = $point; }

$stmt = $pdo->prepare("
  SELECT p.id, p.receipt_no, p.created_at, p.point_name,
         CONCAT(c.first_name,' ',c.last_name) AS customer_name,
         c.phone AS customer_phone,
         p.package_code, p.months_selected, p.amount_paid, p.reason, p.note
  FROM payments p
  JOIN customers c ON c.id=p.customer_id
  WHERE $where
  ORDER BY p.id DESC
  LIMIT 2000
");
$stmt->execute($params);
$rows = $stmt->fetchAll();
$total = array_sum(array_map(fn($r)=>(int)$r['amount_paid'], $rows));
json_out(['ok'=>true,'date'=>$date,'point'=>$point,'total'=>$total,'items'=>$rows]);
