<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_role('admin');

header('Content-Type: application/json; charset=utf-8');

$page   = max(1, (int)($_GET['page'] ?? 1));
$limit  = max(1, min(5000, (int)($_GET['limit'] ?? 25)));
$search = trim((string)($_GET['search'] ?? ''));
$sort   = trim((string)($_GET['sort'] ?? 'list_nr'));
$dir    = strtolower(trim((string)($_GET['dir'] ?? 'asc'))) === 'desc' ? 'DESC' : 'ASC';

$allowedSort = [
  'list_nr'           => 'list_nr',
  'first_name'        => 'first_name',
  'last_name'         => 'last_name',
  'phone'             => 'phone',
  'address'           => 'address',
  'current_package'   => 'current_package',
  'connection_date'   => 'connection_date',
  'last_payment_date' => 'last_payment_date',
  'paid_until'        => 'paid_until',
];

$orderBy = $allowedSort[$sort] ?? 'list_nr';
$offset = ($page - 1) * $limit;

$pdo = db();

$where = "";
$params = [];

if ($search !== '') {
  $where = "WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR address LIKE ?";
  $s = "%{$search}%";
  $params = [$s, $s, $s, $s];
}

$countSql = "SELECT COUNT(*) AS c FROM customers $where";
$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$total = (int)($countStmt->fetch()['c'] ?? 0);

/*
Category priority:
0 = expired subscription
1 = near expiry
2 = free
3 = never paid
4 = normal active
*/
$sql = "
  SELECT
    id,
    list_nr,
    connection_date,
    address,
    first_name,
    last_name,
    phone,
    current_package,
    payment_status,
    last_payment_date,
    paid_until,
    created_at,
    CASE
      WHEN payment_status = 'manual' AND paid_until IS NOT NULL AND paid_until < CURDATE() THEN 0
      WHEN payment_status = 'manual' AND paid_until IS NOT NULL AND DATEDIFF(paid_until, CURDATE()) BETWEEN 0 AND 6 THEN 1
      WHEN payment_status = 'free' THEN 2
      WHEN payment_status = 'never_paid' THEN 3
      ELSE 4
    END AS category_priority
  FROM customers
  $where
  ORDER BY category_priority ASC, $orderBy $dir, id ASC
  LIMIT $limit OFFSET $offset
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$today = new DateTimeImmutable('today', new DateTimeZone('Europe/Tirane'));

$categoryCounts = [
  'expired' => 0,
  'near_expiry' => 0,
  'free' => 0,
  'never_paid' => 0,
  'normal_active' => 0,
];

foreach ($rows as &$r) {
  $debt_days = 0;
  $days_left = null;
  $expiring_soon = false;
  $is_debt = false;
  $is_free = false;

  $status = (string)($r['payment_status'] ?? 'manual');
  $category_key = 'normal_active'; // default fallback

  // 1) FREE clients
  if ($status === 'free') {
    $is_free = true;
    $category_key = 'free';

    if (!empty($r['connection_date'])) {
      $connectionDate = new DateTimeImmutable((string)$r['connection_date'], new DateTimeZone('Europe/Tirane'));
      if ($today > $connectionDate) {
        $debt_days = (int)$connectionDate->diff($today)->format('%a');
      }
    }
  }

  // 2) NEVER PAID clients
  elseif ($status === 'never_paid') {
    $category_key = 'never_paid';

    if (!empty($r['connection_date'])) {
      $connectionDate = new DateTimeImmutable((string)$r['connection_date'], new DateTimeZone('Europe/Tirane'));
      if ($today > $connectionDate) {
        $debt_days = (int)$connectionDate->diff($today)->format('%a');
        $is_debt = true;
      }
    }
  }

  // 3) MANUAL clients
  else {
    // If paid_until exists, classify by subscription status
    if (!empty($r['paid_until'])) {
      $paidUntil = new DateTimeImmutable((string)$r['paid_until'], new DateTimeZone('Europe/Tirane'));

      if ($today > $paidUntil) {
        $debt_days = (int)$paidUntil->diff($today)->format('%a');
        $is_debt = true;
        $category_key = 'expired';
      } else {
        $days_left = (int)$today->diff($paidUntil)->format('%a');

        if ($days_left < 7) {
          $expiring_soon = true;
          $category_key = 'near_expiry';
        } else {
          $category_key = 'normal_active';
        }
      }
    } else {
      // IMPORTANT:
      // manual + empty date fields = still show in normal_active
      $category_key = 'normal_active';
    }
  }

  $r['debt_days'] = $debt_days;
  $r['days_left'] = $days_left;
  $r['expiring_soon'] = $expiring_soon;
  $r['is_debt'] = $is_debt;
  $r['is_free'] = $is_free;
  $r['category_key'] = $category_key;

  if (isset($categoryCounts[$category_key])) {
    $categoryCounts[$category_key]++;
  }
}
unset($r);

json_out([
  'ok' => true,
  'page' => $page,
  'limit' => $limit,
  'total' => $total,
  'category_counts' => $categoryCounts,
  'rows' => $rows,
]);