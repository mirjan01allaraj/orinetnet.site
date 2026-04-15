<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_auth();

header('Content-Type: application/json; charset=utf-8');

$in = read_json();

$customer_id = (int)($in['customer_id'] ?? 0);

$first_name = trim((string)($in['first_name'] ?? ''));
$last_name  = trim((string)($in['last_name'] ?? ''));
$phone_in   = trim((string)($in['phone'] ?? ''));

// prano si "location" ashtu edhe "address"
$address_in = trim((string)($in['location'] ?? $in['address'] ?? ''));

$current_package = strtolower(trim((string)($in['current_package'] ?? 'standarte')));
$connection_date = trim((string)($in['connection_date'] ?? ''));
$payment_status  = strtolower(trim((string)($in['payment_status'] ?? 'manual')));
$last_payment_date = trim((string)($in['last_payment_date'] ?? ''));
$paid_until = trim((string)($in['paid_until'] ?? ''));

$validPackages = ['standarte', 'smart', 'turbo', 'ultra'];
$validStatuses = ['manual', 'never_paid', 'free'];

function valid_date_or_empty(string $s): bool {
  if ($s === '') return true;
  return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) === 1;
}

if ($customer_id <= 0) {
  json_out(['ok' => false, 'error' => 'INVALID_CUSTOMER_ID'], 400);
}

if ($first_name === '' || $last_name === '') {
  json_out(['ok' => false, 'error' => 'MISSING_NAME'], 400);
}

if (!in_array($current_package, $validPackages, true)) {
  json_out(['ok' => false, 'error' => 'INVALID_PACKAGE'], 400);
}

if (!in_array($payment_status, $validStatuses, true)) {
  json_out(['ok' => false, 'error' => 'INVALID_PAYMENT_STATUS'], 400);
}

if (!valid_date_or_empty($connection_date)) {
  json_out(['ok' => false, 'error' => 'INVALID_CONNECTION_DATE'], 400);
}

if (!valid_date_or_empty($last_payment_date)) {
  json_out(['ok' => false, 'error' => 'INVALID_LAST_PAYMENT_DATE'], 400);
}

if (!valid_date_or_empty($paid_until)) {
  json_out(['ok' => false, 'error' => 'INVALID_PAID_UNTIL'], 400);
}

// për free / never_paid mos ruaj data pagese
if ($payment_status === 'free' || $payment_status === 'never_paid') {
  $last_payment_date = '';
  $paid_until = '';
}

$phone = ($phone_in === '') ? null : $phone_in;
$address = ($address_in === '') ? null : $address_in;
$connection_date_db = ($connection_date === '') ? null : $connection_date;
$last_payment_date_db = ($last_payment_date === '') ? null : $last_payment_date;
$paid_until_db = ($paid_until === '') ? null : $paid_until;

$pdo = db();

try {
  $stmt = $pdo->prepare("
    UPDATE customers
    SET
      first_name = ?,
      last_name = ?,
      phone = ?,
      address = ?,
      current_package = ?,
      connection_date = ?,
      payment_status = ?,
      last_payment_date = ?,
      paid_until = ?
    WHERE id = ?
    LIMIT 1
  ");

  $stmt->execute([
    $first_name,
    $last_name,
    $phone,
    $address,
    $current_package,
    $connection_date_db,
    $payment_status,
    $last_payment_date_db,
    $paid_until_db,
    $customer_id
  ]);

  json_out([
    'ok' => true,
    'customer' => [
      'id' => $customer_id,
      'first_name' => $first_name,
      'last_name' => $last_name,
      'phone' => $phone,
      'address' => $address,
      'location' => $address,
      'current_package' => $current_package,
      'connection_date' => $connection_date_db,
      'payment_status' => $payment_status,
      'last_payment_date' => $last_payment_date_db,
      'paid_until' => $paid_until_db,
    ]
  ]);
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'SERVER_ERROR'], 500);
}