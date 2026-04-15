<?php
declare(strict_types=1);

ini_set('display_errors', '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);
set_time_limit(300);
ini_set('memory_limit', '512M');

require_once __DIR__ . '/auth.php';
$u = require_auth();

require_once __DIR__ . '/vendor/autoload.php';


use Dompdf\Dompdf;
use Dompdf\Options;

if (($u['role'] ?? '') !== 'admin') {
  json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
}

$in = read_json();

$from = trim((string)($in['from'] ?? ''));
$to = trim((string)($in['to'] ?? ''));
$periodLabel = trim((string)($in['period_label'] ?? 'custom-range'));
$points = is_array($in['points'] ?? null) ? $in['points'] : [];

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
  json_out(['ok' => false, 'error' => 'INVALID_DATE_RANGE'], 400);
}

if (!class_exists(ZipArchive::class)) {
  json_out(['ok' => false, 'error' => 'ZIP_NOT_AVAILABLE'], 500);
}

if (!class_exists(Dompdf::class)) {
  json_out(['ok' => false, 'error' => 'PDF_LIBRARY_MISSING'], 500);
}

function safe_name(string $value): string {
  $value = trim($value);
  if ($value === '') return 'unknown';

  if (class_exists('Transliterator')) {
    $tr = Transliterator::create('Any-Latin; Latin-ASCII');
    if ($tr) {
      $value = $tr->transliterate($value);
    }
  }

  $value = preg_replace('/[^a-zA-Z0-9\s\-_]/', '', $value) ?? '';
  $value = preg_replace('/\s+/', '_', $value) ?? '';
  $value = preg_replace('/_+/', '_', $value) ?? '';
  return trim($value, '_-') ?: 'unknown';
}

function fmt_date_time_for_file(?string $dt): array {
  if (!$dt) {
    return ['date' => 'unknown-date', 'time' => 'unknown-time'];
  }

  try {
    $d = new DateTimeImmutable($dt);
    return [
      'date' => $d->format('Y-m-d'),
      'time' => $d->format('H-i-s'),
    ];
  } catch (Throwable $e) {
    return ['date' => 'unknown-date', 'time' => 'unknown-time'];
  }
}

function fmt_date_al(?string $v): string {
  if (!$v) return '—';
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $v, $m)) {
    return $m[3] . '/' . $m[2] . '/' . $m[1];
  }
  return $v;
}

function fmt_money($v): string {
  return number_format((float)$v, 0, ',', ',') . ' L';
}

function render_invoice_html(array $p): string {
  $customerName = trim((string)($p['customer_name'] ?? ''));
  $customerPhone = trim((string)($p['customer_phone'] ?? ''));
  $pointName = trim((string)($p['point_name'] ?? ''));
  $receiptNo = trim((string)($p['receipt_no'] ?? ''));
  $package = strtoupper((string)($p['package_code'] ?? ''));
  $monthsSelected = (int)($p['months_selected'] ?? 0);
  $monthsPaid = (int)($p['months_paid'] ?? 0);
  $freeMonths = max(0, $monthsSelected - $monthsPaid);

  return '
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
      .sheet { border: 1px solid #ddd; border-radius: 12px; overflow: hidden; }
      .head { background: #111; color: #fff; padding: 18px; }
      .title { font-size: 24px; font-weight: bold; }
      .sub { margin-top: 4px; font-size: 12px; color: #ddd; }
      .body { padding: 18px; }
      .grid { width: 100%; border-collapse: collapse; margin-top: 12px; }
      .grid td { border: 1px solid #ddd; padding: 8px 10px; }
      .label { color: #555; width: 42%; }
      .value { font-weight: bold; }
      .note { margin-top: 14px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="head">
        <div class="title">ORIENT NET ISP</div>
        <div class="sub">Konfirmim Pagese</div>
        <div class="sub">' . htmlspecialchars($receiptNo) . '</div>
      </div>
      <div class="body">
        <table class="grid">
          <tr><td class="label">Klienti</td><td class="value">' . htmlspecialchars($customerName) . '</td></tr>
          <tr><td class="label">Tel</td><td class="value">' . htmlspecialchars($customerPhone !== '' ? $customerPhone : '—') . '</td></tr>
          <tr><td class="label">Pika</td><td class="value">' . htmlspecialchars($pointName) . '</td></tr>
          <tr><td class="label">Paketa</td><td class="value">' . htmlspecialchars($package) . '</td></tr>
          <tr><td class="label">Abonimi</td><td class="value">' . $monthsSelected . ' muaj</td></tr>
          <tr><td class="label">Muaj të paguar</td><td class="value">' . $monthsPaid . '</td></tr>
          <tr><td class="label">Muaj falas</td><td class="value">' . $freeMonths . '</td></tr>
          <tr><td class="label">Shuma e paguar</td><td class="value">' . htmlspecialchars(fmt_money($p['amount_paid'] ?? 0)) . '</td></tr>
          <tr><td class="label">Pagesa e fundit (para pagesës)</td><td class="value">' . htmlspecialchars((string)($p['previous_last_payment_date'] ? fmt_date_al((string)$p['previous_last_payment_date']) : '—')) . '</td></tr>
          <tr><td class="label">Skadimi aktual (para pagesës)</td><td class="value">' . htmlspecialchars((string)($p['previous_paid_until'] ? fmt_date_al((string)$p['previous_paid_until']) : '—')) . '</td></tr>
          <tr><td class="label">Periudha e re</td><td class="value">' . htmlspecialchars(fmt_date_al((string)($p['service_from'] ?? null)) . ' → ' . fmt_date_al((string)($p['service_to'] ?? null))) . '</td></tr>
          <tr><td class="label">Data e lidhjes</td><td class="value">' . htmlspecialchars(fmt_date_al((string)($p['connection_date'] ?? null))) . '</td></tr>
          <tr><td class="label">Vonesë</td><td class="value">' . (int)($p['debt_days'] ?? 0) . ' ditë</td></tr>
        </table>

        <div class="note">
          Arsyeja: ' . htmlspecialchars((string)($p['reason'] ?? 'Pagesë standarde')) . '<br>
          Shënim: ' . htmlspecialchars((string)(trim((string)($p['note'] ?? '')) !== '' ? $p['note'] : '—')) . '
        </div>
      </div>
    </div>
  </body>
  </html>';
}

$pdo = db();

try {
  $selectedPointNames = [];
  foreach ($points as $p) {
    if (!is_array($p)) continue;
    $pointName = trim((string)($p['point_name'] ?? ''));
    if ($pointName !== '') {
      $selectedPointNames[] = $pointName;
    }
  }
  $selectedPointNames = array_values(array_unique($selectedPointNames));

  if (!$selectedPointNames) {
    json_out(['ok' => false, 'error' => 'POINTS_REQUIRED'], 400);
  }

  $placeholders = implode(',', array_fill(0, count($selectedPointNames), '?'));

  $sql = "
    SELECT
      p.*,
      c.first_name,
      c.last_name,
      c.phone AS customer_phone,
      c.connection_date,
      CONCAT(c.first_name, ' ', c.last_name) AS customer_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.receipt_date BETWEEN ? AND ?
      AND p.point_name IN ($placeholders)
    ORDER BY p.point_name ASC, c.last_name ASC, c.first_name ASC, p.created_at ASC, p.id ASC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute(array_merge([$from, $to], $selectedPointNames));
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

  if (!$rows) {
    json_out(['ok' => false, 'error' => 'NO_INVOICES_FOUND'], 404);
  }

  $zip = new ZipArchive();
  $tmpZip = tempnam(sys_get_temp_dir(), 'invzip_');
  if ($tmpZip === false) {
    json_out(['ok' => false, 'error' => 'TMP_CREATE_FAILED'], 500);
  }

  if ($zip->open($tmpZip, ZipArchive::OVERWRITE) !== true) {
    json_out(['ok' => false, 'error' => 'ZIP_OPEN_FAILED'], 500);
  }

  $rootFolder = 'Faturat_' . safe_name($periodLabel);

  $dompdfOptions = new Options();
  $dompdfOptions->set('isRemoteEnabled', false);

  foreach ($rows as $index => $row) {
    $pointFolder = $rootFolder
      . '/Point_' . safe_name((string)($row['created_by_user_id'] ?? 'user'))
      . '_' . safe_name((string)($row['point_name'] ?? 'Point'));

    $clientNameSafe = safe_name(
      trim((string)($row['first_name'] ?? '') . '_' . (string)($row['last_name'] ?? ''))
    );

    $clientFolder = $pointFolder
      . '/Client_' . $clientNameSafe . '_(' . safe_name($periodLabel) . ')';

    $dt = fmt_date_time_for_file((string)($row['created_at'] ?? $row['receipt_date'] ?? ''));
    $pdfFileName = 'ON_' . $clientNameSafe . '_' . $dt['date'] . '_' . $dt['time'] . '.pdf';

    $dompdf = new Dompdf($dompdfOptions);
    $dompdf->loadHtml(render_invoice_html($row));
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $pdfBinary = $dompdf->output();
    if ($pdfBinary === '') {
      throw new RuntimeException('EMPTY_PDF_OUTPUT_AT_ROW_' . $index);
    }

    if (!$zip->addFromString($clientFolder . '/' . $pdfFileName, $pdfBinary)) {
      throw new RuntimeException('ZIP_ADD_FAILED_AT_ROW_' . $index);
    }
  }

  $zip->close();

  if (!is_file($tmpZip) || filesize($tmpZip) === 0) {
    throw new RuntimeException('ZIP_FILE_EMPTY');
  }

  header_remove();
  header('Content-Type: application/zip');
  header('Content-Disposition: attachment; filename="' . $rootFolder . '.zip"');
  header('Content-Length: ' . (string)filesize($tmpZip));

  readfile($tmpZip);
  @unlink($tmpZip);
  exit;
} catch (Throwable $e) {
  json_out([
    'ok' => false,
    'error' => 'SERVER_ERROR',
    'message' => $e->getMessage(),
    'line' => $e->getLine(),
    'file' => basename($e->getFile()),
  ], 500);
}