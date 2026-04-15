<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
$u = require_auth();

header('Content-Type: application/json; charset=utf-8');

function read_json_safe(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function valid_date(?string $s): bool {
  if ($s === null || $s === '') return false;
  return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) === 1;
}

$in = read_json_safe();

$from   = trim((string)($_GET['from']   ?? $in['from']   ?? ''));
$to     = trim((string)($_GET['to']     ?? $in['to']     ?? ''));
$point  = trim((string)($_GET['point']  ?? $in['point']  ?? ''));
$search = trim((string)($_GET['search'] ?? $in['search'] ?? ''));
$all    = trim((string)($_GET['all']    ?? $in['all']    ?? ''));

// Kur nuk është global search, datat janë të detyrueshme
if ($all !== '1') {
  if (!valid_date($from) || !valid_date($to)) {
    json_out(['ok' => false, 'error' => 'INVALID_DATE_RANGE'], 400);
  }
}

$pdo = db();

try {
  $where = [];
  $params = [];

  // Date filter vetëm kur nuk është all=1
  if ($all !== '1') {
    $where[] = 'DATE(COALESCE(p.receipt_date, p.created_at)) BETWEEN :from AND :to';
    $params[':from'] = $from;
    $params[':to']   = $to;
  }

  // Për point user, kufizoje te point-i i vet
  if (($u['role'] ?? '') !== 'admin') {
    $where[] = 'p.point_name = :user_point_name';
    $params[':user_point_name'] = (string)($u['point_name'] ?? '');
  } elseif ($point !== '') {
    // Për admin, filtro sipas point-it vetëm nëse është zgjedhur
    $where[] = 'p.point_name = :point_name';
    $params[':point_name'] = $point;
  }

  if ($search !== '') {
    $where[] = "(
      CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) LIKE :search_name
      OR c.phone LIKE :search_phone
      OR COALESCE(p.receipt_no, '') LIKE :search_receipt
      OR COALESCE(p.package_code, '') LIKE :search_package
      OR CAST(p.id AS CHAR) LIKE :search_id
    )";

    $like = '%' . $search . '%';
    $params[':search_name']    = $like;
    $params[':search_phone']   = $like;
    $params[':search_receipt'] = $like;
    $params[':search_package'] = $like;
    $params[':search_id']      = $like;
  }

  $sqlWhere = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

  $sql = "
    SELECT
      p.id,
      p.receipt_no,
      p.customer_id,
      p.package_code,
      p.package_price,
      p.months_selected,
      p.months_paid,
      p.amount_paid,
      p.expected_amount,
      p.reason,
      p.note,
      p.method,
      p.receipt_date,
      p.created_at,
      p.service_from,
      p.service_to,
      p.debt_days,
      p.previous_paid_until,
      p.previous_last_payment_date,
      p.point_name,

      CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) AS customer_name,
      c.phone AS customer_phone,
      c.connection_date,
      c.payment_status

    FROM payments p
    LEFT JOIN customers c ON c.id = p.customer_id
    $sqlWhere
    ORDER BY COALESCE(p.receipt_date, p.created_at) DESC, p.id DESC
    LIMIT 1000
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $total = 0;
  foreach ($rows as $r) {
    $total += (int)($r['amount_paid'] ?? 0);
  }

  json_out([
    'ok' => true,
    'from' => ($from !== '' ? $from : null),
    'to' => ($to !== '' ? $to : null),
    'point' => ($point !== '' ? $point : null),
    'all' => ($all === '1'),
    'count' => count($rows),
    'total' => $total,
    'total_amount' => $total,
    'receipts' => $rows,
  ]);

} catch (Throwable $e) {
  json_out([
    'ok' => false,
    'error' => 'SERVER_ERROR',
    'message' => $e->getMessage(),
  ], 500);
}