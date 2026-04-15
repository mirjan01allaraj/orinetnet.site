<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_auth();

$in = read_json();

$first_name = trim((string)($in['first_name'] ?? ''));
$last_name  = trim((string)($in['last_name'] ?? ''));
$phone_in   = trim((string)($in['phone'] ?? ''));
$address_in = trim((string)($in['address'] ?? ''));

// optional, default standarte
$current_package = strtolower(trim((string)($in['current_package'] ?? 'standarte')));
$validPackages = ['standarte','smart','turbo','ultra'];
if (!in_array($current_package, $validPackages, true)) $current_package = 'standarte';

if ($first_name === '' || $last_name === '') {
  json_out(['ok'=>false,'error'=>'MISSING_NAME'], 400);
}

// ✅ Uppercase rule
$first_name = mb_strtoupper($first_name, 'UTF-8');
$last_name  = mb_strtoupper($last_name, 'UTF-8');

// normalize phone -> null if empty
$phone = ($phone_in === '') ? null : preg_replace('/\s+/', '', $phone_in);

// normalize address
$address = ($address_in === '') ? null : $address_in;

// ✅ Auto connection date (Data e Lidhjes)
$connection_date = (new DateTime('now', new DateTimeZone('Europe/Tirane')))->format('Y-m-d');

$pdo = db();

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare("
    INSERT INTO customers (
      first_name,
      last_name,
      phone,
      current_package,
      connection_date,
      address
    )
    VALUES (?, ?, ?, ?, ?, ?)
  ");

  $stmt->execute([
    $first_name,
    $last_name,
    $phone,
    $current_package,
    $connection_date,
    $address
  ]);

  $id = (int)$pdo->lastInsertId();

  // ✅ Refresh list_nr after insert (alphabetical order)
  $pdo->exec("SET @row := 0");
  $pdo->exec("
    UPDATE customers c
    JOIN (
      SELECT id
      FROM customers
      ORDER BY last_name ASC, first_name ASC
    ) s ON s.id = c.id
    SET c.list_nr = (@row := @row + 1)
  ");

  $pdo->commit();
  json_out(['ok'=>true,'id'=>$id]);

} catch (PDOException $e) {

  if ($pdo->inTransaction()) $pdo->rollBack();

  $msg = $e->getMessage();

  if (str_contains($msg, 'uq_customers_phone') || str_contains($msg, 'Duplicate')) {
    json_out(['ok'=>false,'error'=>'PHONE_EXISTS'], 409);
  }

  json_out(['ok'=>false,'error'=>'DB_ERROR'], 500);

} catch (Throwable $e) {

  if ($pdo->inTransaction()) $pdo->rollBack();
  json_out(['ok'=>false,'error'=>'SERVER_ERROR'], 500);

}