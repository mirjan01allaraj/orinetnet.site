<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

$id = (int)($_GET['id'] ?? 0);
$token = trim((string)($_GET['token'] ?? ''));

if ($id <= 0) {
  json_out(['ok' => false, 'error' => 'INVALID_ID'], 400);
}

$pdo = db();

$stmt = $pdo->prepare("
  SELECT
    p.*,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone AS customer_phone,
    c.connection_date AS customer_connection_date,
    c.payment_status AS customer_payment_status
  FROM payments p
  JOIN customers c ON c.id = p.customer_id
  WHERE p.id = ?
  LIMIT 1
");
$stmt->execute([$id]);

$p = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$p) {
  json_out(['ok' => false, 'error' => 'NOT_FOUND'], 404);
}

$receiptToken = trim((string)($p['receipt_token'] ?? ''));
$baseUrl = 'https://orientnet.al';

if ($receiptToken !== '') {
  $p['public_receipt_url'] =
    $baseUrl . '/pagesat/receipt-public/?id=' . rawurlencode((string)$id) .
    '&token=' . rawurlencode($receiptToken);

  $p['public_pdf_url'] =
    $baseUrl . '/pagesat-api/export_receipt_pdf.php?id=' . rawurlencode((string)$id) .
    '&token=' . rawurlencode($receiptToken);
} else {
  $p['public_receipt_url'] = null;
  $p['public_pdf_url'] = null;
}

// Public access with secure token
if ($token !== '') {
  if ($receiptToken === '' || !hash_equals($receiptToken, $token)) {
    json_out(['ok' => false, 'error' => 'NOT_FOUND'], 404);
  }

  json_out([
    'ok' => true,
    'payment' => $p
  ]);
}

// Normal staff access with session
$u = require_auth();

if (
  ($u['role'] ?? '') !== 'admin' &&
  (string)($p['point_name'] ?? '') !== (string)($u['point_name'] ?? '')
) {
  json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
}

json_out([
  'ok' => true,
  'payment' => $p
]);