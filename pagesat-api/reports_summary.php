<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_role('admin');

header('Content-Type: application/json; charset=utf-8');

$in = read_json();

$period_days = (int)($in['period_days'] ?? 30);
$valid = [1,3,7,14,30,90,180,365];
if (!in_array($period_days, $valid, true)) $period_days = 30;

$point_name = trim((string)($in['point_name'] ?? ''));
if ($point_name === '') $point_name = null;

$pdo = db();

try {
  // Base WHERE (cash only)
  $where = "p.method='cash' AND p.receipt_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)";
  if ($point_name !== null) $where .= " AND p.point_name = :point_name";

  // Totals
  $sqlTotal = "SELECT
      COALESCE(SUM(p.amount_paid),0) AS total_amount,
      COUNT(*) AS total_count
    FROM payments p
    WHERE $where
  ";
  $st = $pdo->prepare($sqlTotal);
  $st->bindValue(':days', $period_days, PDO::PARAM_INT);
  if ($point_name !== null) $st->bindValue(':point_name', $point_name, PDO::PARAM_STR);
  $st->execute();
  $tot = $st->fetch() ?: ['total_amount'=>0,'total_count'=>0];

  // By point
  $sqlPoint = "SELECT
      COALESCE(p.point_name,'') AS k,
      COALESCE(SUM(p.amount_paid),0) AS total,
      COUNT(*) AS cnt
    FROM payments p
    WHERE $where
    GROUP BY k
    ORDER BY total DESC
  ";
  $st = $pdo->prepare($sqlPoint);
  $st->bindValue(':days', $period_days, PDO::PARAM_INT);
  if ($point_name !== null) $st->bindValue(':point_name', $point_name, PDO::PARAM_STR);
  $st->execute();
  $byPoint = array_map(function($r){
    return ['key'=>(string)$r['k'], 'total'=>(float)$r['total'], 'count'=>(int)$r['cnt']];
  }, $st->fetchAll());

  // By package
  $sqlPkg = "SELECT
      COALESCE(p.package_code,'') AS k,
      COALESCE(SUM(p.amount_paid),0) AS total,
      COUNT(*) AS cnt
    FROM payments p
    WHERE $where
    GROUP BY k
    ORDER BY total DESC
  ";
  $st = $pdo->prepare($sqlPkg);
  $st->bindValue(':days', $period_days, PDO::PARAM_INT);
  if ($point_name !== null) $st->bindValue(':point_name', $point_name, PDO::PARAM_STR);
  $st->execute();
  $byPkg = array_map(function($r){
    return ['key'=>(string)$r['k'], 'total'=>(float)$r['total'], 'count'=>(int)$r['cnt']];
  }, $st->fetchAll());

  // Trend by day
  $sqlTrend = "SELECT
      DATE(p.receipt_date) AS d,
      COALESCE(SUM(p.amount_paid),0) AS total,
      COUNT(*) AS cnt
    FROM payments p
    WHERE $where
    GROUP BY d
    ORDER BY d ASC
  ";
  $st = $pdo->prepare($sqlTrend);
  $st->bindValue(':days', $period_days, PDO::PARAM_INT);
  if ($point_name !== null) $st->bindValue(':point_name', $point_name, PDO::PARAM_STR);
  $st->execute();
  $trend = array_map(function($r){
    return ['day'=>(string)$r['d'], 'total'=>(float)$r['total'], 'count'=>(int)$r['cnt']];
  }, $st->fetchAll());

  json_out([
    'ok'=>true,
    'period_days'=>$period_days,
    'point_name'=>$point_name,
    'total_amount'=>(float)$tot['total_amount'],
    'total_count'=>(int)$tot['total_count'],
    'by_point'=>$byPoint,
    'by_package'=>$byPkg,
    'trend'=>$trend,
  ]);

} catch (Throwable $e) {
  json_out(['ok'=>false,'error'=>'REPORTS_FAILED'], 500);
}