<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
$u = require_auth();

header('Content-Type: application/json; charset=utf-8');

if (($u['role'] ?? '') !== 'admin') {
  json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
}

$dryRun = isset($_GET['dry_run']) || (($_POST['dry_run'] ?? '') === '1');
$mode = strtolower(trim((string)($_POST['mode'] ?? $_GET['mode'] ?? 'merge')));
if (!in_array($mode, ['merge', 'overwrite'], true)) {
  $mode = 'merge';
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
  json_out(['ok' => false, 'error' => 'FILE_REQUIRED'], 400);
}

$file = $_FILES['file'];
if ((int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  json_out(['ok' => false, 'error' => 'UPLOAD_FAILED'], 400);
}

$tmp = (string)$file['tmp_name'];
$originalName = (string)($file['name'] ?? 'backup');
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($ext, ['json', 'sql', 'xlsx'], true)) {
  json_out(['ok' => false, 'error' => 'UNSUPPORTED_FILE_TYPE'], 400);
}

$pdo = db();

function normalize_phone(?string $phone): ?string {
  $phone = trim((string)$phone);
  return $phone === '' ? null : $phone;
}

function parse_date_or_null(?string $v): ?string {
  $v = trim((string)$v);
  if ($v === '') return null;

  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
    return $v;
  }

  if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $v, $m)) {
    return $m[3] . '-' . $m[2] . '-' . $m[1];
  }

  return null;
}

function package_or_default(?string $v): string {
  $v = strtolower(trim((string)$v));
  return in_array($v, ['standarte', 'smart', 'turbo', 'ultra'], true) ? $v : 'standarte';
}

function payment_status_or_default(?string $v): string {
  $v = strtolower(trim((string)$v));
  return in_array($v, ['manual', 'never_paid', 'free'], true) ? $v : 'manual';
}

function safe_preview_rows(array $rows, int $limit = 10): array {
  return array_slice($rows, 0, $limit);
}

function json_detect_counts(array $data): array {
  return [
    'customers' => is_array($data['customers'] ?? null) ? count($data['customers']) : 0,
    'payments' => is_array($data['payments'] ?? null) ? count($data['payments']) : 0,
    'invoices' => is_array($data['invoices'] ?? null) ? count($data['invoices']) : 0,
    'receipts' => is_array($data['receipts'] ?? null) ? count($data['receipts']) : 0,
  ];
}

try {
  if ($ext === 'xlsx') {
    json_out([
      'ok' => false,
      'error' => 'XLSX_IMPORT_NOT_ENABLED',
      'message' => 'Për import .xlsx duhet PhpSpreadsheet në server.',
    ], 400);
  }

  if ($ext === 'sql') {
    $sql = file_get_contents($tmp);
    if ($sql === false) {
      json_out(['ok' => false, 'error' => 'READ_FAILED'], 400);
    }

    preg_match_all('/\bINSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?/i', $sql, $m);
    $tables = array_values(array_unique($m[1] ?? []));

    $detected = [
      'customers' => in_array('customers', $tables, true) ? 1 : 0,
      'payments' => in_array('payments', $tables, true) ? 1 : 0,
      'invoices' => in_array('invoices', $tables, true) ? 1 : 0,
      'receipts' => in_array('receipts', $tables, true) ? 1 : 0,
    ];

    if ($dryRun) {
      json_out([
        'ok' => true,
        'file_type' => 'sql',
        'mode' => $mode,
        'detected' => $detected,
        'warnings' => [
          'SQL import ekzekuton komandat siç janë në file.',
          'Përdor overwrite vetëm kur je i sigurt.',
        ],
        'preview_rows' => [
          ['file' => $originalName, 'tables_detected' => implode(', ', $tables)],
        ],
      ]);
    }

    $pdo->beginTransaction();
    try {
      if ($mode === 'overwrite') {
        $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
      }

      $pdo->exec($sql);

      if ($mode === 'overwrite') {
        $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
      }

      $pdo->commit();

      json_out([
        'ok' => true,
        'file_type' => 'sql',
        'mode' => $mode,
        'imported' => true,
      ]);
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }
      json_out(['ok' => false, 'error' => 'SQL_IMPORT_FAILED'], 500);
    }
  }

  // JSON import
  $raw = file_get_contents($tmp);
  if ($raw === false) {
    json_out(['ok' => false, 'error' => 'READ_FAILED'], 400);
  }

  $data = json_decode($raw, true);
  if (!is_array($data)) {
    json_out(['ok' => false, 'error' => 'INVALID_JSON'], 400);
  }

  $customers = is_array($data['customers'] ?? null) ? $data['customers'] : [];
  $payments = is_array($data['payments'] ?? null) ? $data['payments'] : [];
  $invoices = is_array($data['invoices'] ?? null) ? $data['invoices'] : [];
  $receipts = is_array($data['receipts'] ?? null) ? $data['receipts'] : [];

  $warnings = [];
  if (!$customers && !$payments && !$invoices && !$receipts) {
    $warnings[] = 'Nuk u gjetën koleksione standarde: customers, payments, invoices, receipts.';
  }

  if ($dryRun) {
    $previewRows = [];

    foreach (safe_preview_rows($customers, 5) as $row) {
      $previewRows[] = [
        'type' => 'customer',
        'first_name' => (string)($row['first_name'] ?? ''),
        'last_name' => (string)($row['last_name'] ?? ''),
        'phone' => (string)($row['phone'] ?? ''),
        'package' => (string)($row['current_package'] ?? ''),
      ];
    }

    foreach (safe_preview_rows($payments, 5) as $row) {
      $previewRows[] = [
        'type' => 'payment',
        'receipt_no' => (string)($row['receipt_no'] ?? ''),
        'customer_id' => (string)($row['customer_id'] ?? ''),
        'amount_paid' => (string)($row['amount_paid'] ?? ''),
      ];
    }

    json_out([
      'ok' => true,
      'file_type' => 'json',
      'mode' => $mode,
      'detected' => json_detect_counts($data),
      'warnings' => $warnings,
      'preview_rows' => $previewRows,
    ]);
  }

  $insertedCustomers = 0;
  $updatedCustomers = 0;
  $insertedPayments = 0;

  $pdo->beginTransaction();
  try {
    if ($mode === 'overwrite') {
      $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
      $pdo->exec("DELETE FROM payments");
      $pdo->exec("DELETE FROM customers");
      $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    }

    $findCustomerByPhone = $pdo->prepare("
      SELECT id
      FROM customers
      WHERE phone <=> ?
      LIMIT 1
    ");

    $insertCustomer = $pdo->prepare("
      INSERT INTO customers
      (
        first_name,
        last_name,
        phone,
        current_package,
        connection_date,
        address,
        payment_status,
        last_payment_date,
        paid_until,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");

    $updateCustomer = $pdo->prepare("
      UPDATE customers
      SET
        first_name = ?,
        last_name = ?,
        current_package = ?,
        connection_date = ?,
        address = ?,
        payment_status = ?,
        last_payment_date = ?,
        paid_until = ?
      WHERE id = ?
      LIMIT 1
    ");

    foreach ($customers as $row) {
      $first = trim((string)($row['first_name'] ?? ''));
      $last = trim((string)($row['last_name'] ?? ''));
      if ($first === '' || $last === '') {
        continue;
      }

      $phone = normalize_phone($row['phone'] ?? null);
      $pkg = package_or_default($row['current_package'] ?? null);
      $connectionDate = parse_date_or_null($row['connection_date'] ?? null);
      $address = trim((string)($row['address'] ?? ''));
      $paymentStatus = payment_status_or_default($row['payment_status'] ?? null);
      $lastPaymentDate = parse_date_or_null($row['last_payment_date'] ?? null);
      $paidUntil = parse_date_or_null($row['paid_until'] ?? null);

      if ($mode === 'merge' && $phone !== null) {
        $findCustomerByPhone->execute([$phone]);
        $found = $findCustomerByPhone->fetch(PDO::FETCH_ASSOC);

        if ($found) {
          $updateCustomer->execute([
            $first,
            $last,
            $pkg,
            $connectionDate,
            $address !== '' ? $address : null,
            $paymentStatus,
            $lastPaymentDate,
            $paidUntil,
            (int)$found['id'],
          ]);
          $updatedCustomers++;
          continue;
        }
      }

      $insertCustomer->execute([
        $first,
        $last,
        $phone,
        $pkg,
        $connectionDate,
        $address !== '' ? $address : null,
        $paymentStatus,
        $lastPaymentDate,
        $paidUntil,
      ]);
      $insertedCustomers++;
    }

    $insertPayment = $pdo->prepare("
      INSERT INTO payments
      (
        customer_id,
        created_by_user_id,
        point_name,
        package_code,
        package_price,
        months_selected,
        months_paid,
        expected_amount,
        amount_paid,
        reason,
        note,
        method,
        receipt_no,
        receipt_date,
        service_from,
        service_to,
        debt_days,
        previous_paid_until,
        previous_last_payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($payments as $row) {
      $customerId = (int)($row['customer_id'] ?? 0);
      if ($customerId <= 0) {
        continue;
      }

      $insertPayment->execute([
        $customerId,
        (int)($row['created_by_user_id'] ?? $u['id']),
        (string)($row['point_name'] ?? $u['point_name']),
        package_or_default($row['package_code'] ?? null),
        (int)($row['package_price'] ?? 0),
        (int)($row['months_selected'] ?? 0),
        (int)($row['months_paid'] ?? 0),
        (int)($row['expected_amount'] ?? 0),
        (int)($row['amount_paid'] ?? 0),
        trim((string)($row['reason'] ?? 'Import DB')),
        trim((string)($row['note'] ?? '')) ?: null,
        trim((string)($row['method'] ?? 'cash')),
        trim((string)($row['receipt_no'] ?? '')),
        parse_date_or_null($row['receipt_date'] ?? null) ?? date('Y-m-d'),
        parse_date_or_null($row['service_from'] ?? null),
        parse_date_or_null($row['service_to'] ?? null),
        (int)($row['debt_days'] ?? 0),
        parse_date_or_null($row['previous_paid_until'] ?? null),
        parse_date_or_null($row['previous_last_payment_date'] ?? null),
      ]);
      $insertedPayments++;
    }

    $pdo->commit();

    json_out([
      'ok' => true,
      'file_type' => 'json',
      'mode' => $mode,
      'inserted_customers' => $insertedCustomers,
      'updated_customers' => $updatedCustomers,
      'inserted_payments' => $insertedPayments,
      'detected' => json_detect_counts($data),
    ]);
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) {
      $pdo->rollBack();
    }
    json_out(['ok' => false, 'error' => 'JSON_IMPORT_FAILED'], 500);
  }
} catch (Throwable $e) {
  json_out(['ok' => false, 'error' => 'SERVER_ERROR'], 500);
}