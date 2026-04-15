<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$q = trim((string)($_GET['q'] ?? ''));

if (mb_strlen($q) < 2) {
  json_out(['ok' => true, 'customers' => []]);
}

$pdo = db();
$like = '%' . $q . '%';

$stmt = $pdo->prepare("
  SELECT
    id,
    first_name,
    last_name,
    phone,
    current_package,
    connection_date,
    payment_status,
    last_payment_date,
    paid_until,
    address,
    address AS location
  FROM customers
  WHERE is_active = 1
    AND (
      first_name LIKE ?
      OR last_name LIKE ?
      OR phone LIKE ?
      OR address LIKE ?
      OR CONCAT(first_name, ' ', last_name) LIKE ?
    )
  ORDER BY first_name ASC, last_name ASC
  LIMIT 30
");

$stmt->execute([$like, $like, $like, $like, $like]);

json_out([
  'ok' => true,
  'customers' => $stmt->fetchAll(PDO::FETCH_ASSOC),
]);