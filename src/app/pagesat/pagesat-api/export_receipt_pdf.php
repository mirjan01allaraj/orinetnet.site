<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/_lib/receipt_qr.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$id = (int)($_GET['id'] ?? 0);
$token = trim((string)($_GET['token'] ?? ''));

if ($id <= 0) {
  json_out(['ok' => false, 'error' => 'INVALID_ID'], 400);
}

if (!class_exists(Dompdf::class)) {
  json_out(['ok' => false, 'error' => 'PDF_LIBRARY_MISSING'], 500);
}

function h($v): string {
  return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

function fmt_date_al(?string $v): string {
  if (!$v) return '—';
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $v, $m)) {
    return ((int)$m[3]) . '/' . ((int)$m[2]) . '/' . $m[1];
  }
  return $v;
}

function fmt_datetime_al(?string $v): string {
  if (!$v) return '—';

  try {
    $d = new DateTimeImmutable($v, new DateTimeZone('Europe/Tirane'));
    return $d->format('j/n/Y, g:i:s A');
  } catch (Throwable $e) {
    return $v;
  }
}

function fmt_money($v): string {
  return number_format((float)$v, 0, ',', ',') . ' L';
}

function render_receipt_html(array $data): string {
  $pkgCode = strtoupper((string)($data['package_code'] ?? ''));
  $pkgPrice = (int)($data['package_price'] ?? 0);
  $monthsSel = (int)($data['months_selected'] ?? 0);
  $monthsPaid = (int)($data['months_paid'] ?? 0);
  $freeMonths = max(0, $monthsSel - $monthsPaid);
  $expected = (int)($data['expected_amount'] ?? 0);
  $paid = (int)($data['amount_paid'] ?? 0);
  $hasDeal = $paid !== $expected;

  $qrDataUri = build_receipt_qr_data_uri($data, 180);
  $qrDataUri58 = build_receipt_qr_data_uri($data, 220);

  $debtDays = (int)($data['debt_days'] ?? 0);
  $paymentStatusBefore = strtolower((string)($data['payment_status_before'] ?? $data['customer_payment_status'] ?? 'manual'));

  $previousLastPaymentDate = $data['previous_last_payment_date'] ?? null;
  $previousPaidUntil = $data['previous_paid_until'] ?? null;
  $connectionDate = $data['connection_date'] ?? $data['customer_connection_date'] ?? null;

  $lastPaymentLabel = '—';
  if ($paymentStatusBefore === 'never_paid' || (!$previousLastPaymentDate && $connectionDate)) {
    $lastPaymentLabel = 'Asnjë pagesë';
  } elseif ($paymentStatusBefore === 'free') {
    $lastPaymentLabel = 'Free';
  } elseif ($previousLastPaymentDate) {
    $lastPaymentLabel = fmt_date_al((string)$previousLastPaymentDate);
  }

  $calculationTitle = 'Llogaritja e skadimit';
  $calculationText = '';
  $calcBase = $data['service_from'] ?? null;
  $calcEnd = $data['service_to'] ?? null;

  if ($previousPaidUntil && $debtDays > 0) {
    $calculationTitle = 'Llogaritja me vonesë';
    $calculationText =
      'Klienti ka qenë me vonesë ' . $debtDays . ' ditë. ' .
      'Skadimi i ri është llogaritur nga skadimi i mëparshëm ' .
      fmt_date_al((string)$previousPaidUntil) .
      ' + ' . $monthsSel . ' muaj = ' . fmt_date_al((string)$calcEnd) . '.';
  } elseif ($previousPaidUntil && $debtDays <= 0) {
    $calculationTitle = 'Llogaritja për klient aktiv';
    $calculationText =
      'Klienti ka qenë aktiv. ' .
      'Skadimi i ri është llogaritur nga skadimi aktual ' .
      fmt_date_al((string)$previousPaidUntil) .
      ' + ' . $monthsSel . ' muaj = ' . fmt_date_al((string)$calcEnd) . '.';
  } elseif ($connectionDate) {
    $calculationTitle = 'Llogaritja pa pagesë të mëparshme';
    $calculationText =
      'Klienti nuk ka pasur pagesë të mëparshme. ' .
      'Skadimi i ri është llogaritur nga data e lidhjes ' .
      fmt_date_al((string)$connectionDate) .
      ' + ' . $monthsSel . ' muaj = ' . fmt_date_al((string)$calcEnd) . '.';
  } else {
    $calculationTitle = 'Llogaritja e skadimit';
    $calculationText =
      'Skadimi i ri është llogaritur nga ' .
      fmt_date_al((string)$calcBase) .
      ' + ' . $monthsSel . ' muaj = ' . fmt_date_al((string)$calcEnd) . '.';
  }

  $reason = trim((string)($data['reason'] ?? ''));
  if ($reason === '') $reason = 'Pagesë standarde';

  $note = trim((string)($data['note'] ?? ''));
  if ($note === '') $note = '—';

  $mainAmountLabel = $hasDeal ? 'Shuma e rënë dakord' : 'Totali i paguar';
  $delayBadge = $debtDays > 0 ? 'VONESË: ' . $debtDays . ' ditë' : 'PA VONESË';

  $amountLineHtml = '';
  if ($pkgPrice > 0 && $monthsSel > 0) {
    if ($hasDeal) {
      $amountLineHtml = '
        <div class="amount-line">
          <div>
            Çmimi standard: ' . h(fmt_money($pkgPrice)) . ' × ' . $monthsPaid . ' muaj të paguar' .
            ($freeMonths > 0 ? ' (+ ' . $freeMonths . ' muaj falas)' : '') .
            ' = <span class="semibold">' . h(fmt_money($expected)) . '</span>
          </div>
          <div class="deal-box">
            Shuma e rënë dakord:
            <span class="bold">' . h(fmt_money($paid)) . '</span>
          </div>
        </div>';
    } else {
      $amountLineHtml = '
        <div class="amount-line">
          <div>
            ' . h(fmt_money($pkgPrice)) . ' × ' . $monthsPaid . ' muaj të paguar' .
            ($freeMonths > 0 ? ' (+ ' . $freeMonths . ' muaj falas)' : '') .
            ' = <span class="semibold">' . h(fmt_money($paid)) . '</span>
          </div>
        </div>';
    }
  }

  return '
  <!doctype html>
  <html lang="sq">
  <head>
    <meta charset="utf-8">
    <style>
      @page {
        size: A4 portrait;
        margin: 8mm;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: DejaVu Sans, sans-serif;
        background: #ffffff;
        color: #111111;
        font-size: 12px;
      }

      .sheet {
        border: 1px solid #d9d9d9;
        border-radius: 14px;
        overflow: hidden;
      }

      .header {
        background: #000000;
        color: #ffffff;
        padding: 16px 18px;
      }

      .header-table {
        width: 100%;
        border-collapse: collapse;
      }

      .header-right {
        text-align: right;
        vertical-align: top;
      }

      .title-big {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }

      .title-mid {
        font-size: 16px;
        font-weight: 700;
        margin-top: 4px;
      }

      .subtle-white {
        font-size: 11px;
        color: #dddddd;
        margin-top: 3px;
      }

      .body {
        padding: 14px;
      }

      .two-col {
        width: 100%;
        border-collapse: separate;
        border-spacing: 10px 0;
      }

      .card {
        border: 1px solid #dddddd;
        border-radius: 14px;
        padding: 12px;
        vertical-align: top;
      }

      .section-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
        color: #666666;
        margin-bottom: 6px;
      }

      .customer-name {
        font-size: 16px;
        font-weight: 700;
      }

      .text-sm {
        font-size: 11px;
        color: #555555;
      }

      .chip-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 8px;
        margin-top: 10px;
      }

      .chip-box {
        width: 100%;
        border: 1px solid #dddddd;
        border-radius: 10px;
        padding: 8px 10px;
      }

      .chip-label {
        color: #666666;
        font-size: 11px;
      }

      .chip-value {
        font-weight: 700;
        text-align: right;
        font-size: 11px;
      }

      .payment-layout {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }

      .payment-left {
        width: 68%;
        vertical-align: top;
        padding-right: 10px;
      }

      .payment-right {
        width: 32%;
        vertical-align: top;
      }

      .main-total {
        border: 1px solid #dddddd;
        border-radius: 14px;
        background: #f7f7f7;
        padding: 12px;
        margin-top: 10px;
      }

      .money-big {
        font-size: 28px;
        font-weight: 800;
        margin-top: 4px;
      }

      .amount-line {
        margin-top: 8px;
        font-size: 10px;
        color: #555555;
        line-height: 1.5;
      }

      .deal-box {
        margin-top: 6px;
        border: 1px solid #e7c36a;
        background: #fff6df;
        color: #8a5a00;
        border-radius: 10px;
        padding: 8px 10px;
      }

      .reason-box {
        margin-top: 10px;
        border: 1px solid #dddddd;
        border-radius: 10px;
        padding: 8px 10px;
      }

      .reason-row {
        width: 100%;
        border-collapse: collapse;
      }

      .reason-label {
        font-size: 11px;
        color: #666666;
        white-space: nowrap;
        vertical-align: top;
      }

      .reason-value {
        font-size: 11px;
        font-weight: 700;
        color: #111111;
        text-align: right;
        vertical-align: top;
      }

      .qr-wrap {
        border: 1px solid #dddddd;
        border-radius: 12px;
        padding: 10px;
        text-align: center;
      }

      .qr-title {
        font-size: 10px;
        color: #666666;
        margin-bottom: 8px;
      }

      .qr-image {
        display: block;
        margin: 0 auto;
      }

      .qr-bottom {
        margin-top: 14px;
        border: 1px solid #dddddd;
        border-radius: 12px;
        padding: 12px;
        text-align: center;
      }

      .qr-bottom-title {
        font-size: 10px;
        color: #666666;
        margin-bottom: 8px;
      }

      .semibold { font-weight: 700; color: #111111; }
      .bold { font-weight: 800; color: #111111; }

      .section {
        margin-top: 14px;
        border: 1px solid #dddddd;
        border-radius: 14px;
        padding: 12px;
      }

      .section-head-table {
        width: 100%;
        border-collapse: collapse;
      }

      .badge {
        text-align: right;
      }

      .badge span {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        border: 1px solid ' . ($debtDays > 0 ? '#f1b2b2' : '#b7e3cd') . ';
        background: ' . ($debtDays > 0 ? '#fff1f1' : '#eefcf4') . ';
        color: ' . ($debtDays > 0 ? '#b42318' : '#067647') . ';
      }

      .detail-grid {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 8px;
        margin-top: 10px;
      }

      .detail-box {
        border: 1px solid #dddddd;
        border-radius: 12px;
        background: #f8f8f8;
        padding: 10px 12px;
      }

      .new-end-table {
        width: 100%;
        border-collapse: collapse;
      }

      .new-end-title {
        font-size: 16px;
        font-weight: 800;
      }

      .new-end-date {
        text-align: right;
        font-size: 24px;
        font-weight: 800;
      }

      .muted-xs {
        margin-top: 5px;
        font-size: 10px;
        color: #666666;
      }

      .calc-box {
        margin-top: 10px;
        border: 1px solid #dddddd;
        border-radius: 12px;
        background: #f7f7f7;
        padding: 12px;
      }

      .foot-note {
        margin-top: 14px;
        border: 1px solid #dddddd;
        border-radius: 12px;
        background: #f7f7f7;
        padding: 10px 12px;
        text-align: center;
        font-size: 10px;
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <table class="header-table">
          <tr>
            <td>
              <div class="title-big">ORIENT NET ISP</div>
              <div class="subtle-white">NIPT: M32217031B</div>
              <div class="subtle-white">Adresa: Rr “Demokracia”, Paskuqan 2, Tiranë</div>
            </td>
            <td class="header-right">
              <div class="subtle-white" style="text-transform:uppercase; letter-spacing:1.4px;">Konfirmim Pagese</div>
              <div class="title-mid">' . h((string)($data['receipt_no'] ?? '')) . '</div>
              <div class="subtle-white">' . h(fmt_datetime_al((string)($data['created_at'] ?? ''))) . '</div>
              <div class="subtle-white">Pika: ' . h((string)($data['point_name'] ?? '—')) . '</div>
            </td>
          </tr>
        </table>
      </div>

      <div class="body">
        <table class="two-col">
          <tr>
            <td class="card" style="width:50%;">
              <div class="section-label">Klienti</div>
              <div class="customer-name">' . h((string)($data['customer_name'] ?? '—')) . '</div>
              <div class="text-sm" style="margin-top:8px;"><b>Tel:</b> ' . h((string)($data['customer_phone'] ?? '—')) . '</div>

              <table class="chip-table">
                <tr>
                  <td>
                    <table class="chip-box"><tr>
                      <td class="chip-label">Paketa</td>
                      <td class="chip-value">' . h($pkgCode . ' (' . fmt_money($pkgPrice) . ' / muaj)') . '</td>
                    </tr></table>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table width="100%" cellspacing="8" cellpadding="0" style="margin:0;">
                      <tr>
                        <td style="width:33.33%; padding-right:4px;">
                          <table class="chip-box"><tr><td class="chip-label">Abonimi</td><td class="chip-value">' . $monthsSel . ' muaj</td></tr></table>
                        </td>
                        <td style="width:33.33%; padding-left:4px; padding-right:4px;">
                          <table class="chip-box"><tr><td class="chip-label">Muaj të paguar</td><td class="chip-value">' . $monthsPaid . '</td></tr></table>
                        </td>
                        <td style="width:33.33%; padding-left:4px;">
                          <table class="chip-box"><tr><td class="chip-label">Muaj falas</td><td class="chip-value">' . $freeMonths . '</td></tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table width="100%" cellspacing="8" cellpadding="0" style="margin:0;">
                      <tr>
                        <td style="width:50%; padding-right:4px;">
                          <table class="chip-box"><tr><td class="chip-label">Shuma standarde</td><td class="chip-value">' . h(fmt_money($expected)) . '</td></tr></table>
                        </td>
                        <td style="width:50%; padding-left:4px;">
                          <table class="chip-box"><tr><td class="chip-label">' .
                            h($hasDeal ? 'Shuma e paguar (marrëveshje)' : 'Shuma e paguar') .
                          '</td><td class="chip-value">' . h(fmt_money($paid)) . '</td></tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ' . $amountLineHtml . '
            </td>

            <td class="card" style="width:50%;">
              <div class="section-label">Pagesa</div>

              <table class="payment-layout">
                <tr>
                  <td class="payment-left">
                    <div class="main-total">
                      <div class="text-sm">' . h($mainAmountLabel) . '</div>
                      <div class="money-big">' . h(fmt_money($paid)) . '</div>
                    </div>

                    <div class="reason-box">
                      <table class="reason-row">
                        <tr>
                          <td class="reason-label">Arsyeja</td>
                          <td class="reason-value">' . h($reason) . '</td>
                        </tr>
                      </table>
                    </div>' .
                    ($note !== '—'
                      ? '<div class="reason-box" style="margin-top:8px;">
                          <table class="reason-row">
                            <tr>
                              <td class="reason-label">Shënim</td>
                              <td class="reason-value">' . h($note) . '</td>
                            </tr>
                          </table>
                        </div>'
                      : '') . '
                  </td>

                  <td class="payment-right">' .
                    ($qrDataUri
                      ? '<div class="qr-wrap">
                          <div class="qr-title">Skano për verifikim online</div>
                          <img class="qr-image" src="' . h($qrDataUri) . '" width="110" height="110" alt="QR Code" />
                        </div>'
                      : '') . '
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div class="section">
          <table class="section-head-table">
            <tr>
              <td><div class="section-label">Detaje abonimi</div></td>
              <td class="badge"><span>' . h($delayBadge) . '</span></td>
            </tr>
          </table>

          <table class="detail-grid">
            <tr>
              <td style="width:50%; padding-right:4px;">
                <table class="chip-box"><tr><td class="chip-label">Data e lidhjes</td><td class="chip-value">' . h(fmt_date_al((string)$connectionDate)) . '</td></tr></table>
              </td>
              <td style="width:50%; padding-left:4px;">
                <table class="chip-box"><tr><td class="chip-label">Pagesa e fundit (para pagesës)</td><td class="chip-value">' . h($lastPaymentLabel) . '</td></tr></table>
              </td>
            </tr>

            <tr>
              <td style="width:50%; padding-right:4px;">
                <table class="chip-box"><tr><td class="chip-label">Skadimi aktual (para pagesës)</td><td class="chip-value">' . h(fmt_date_al((string)$previousPaidUntil)) . '</td></tr></table>
              </td>
              <td style="width:50%; padding-left:4px;">
                <table class="chip-box"><tr><td class="chip-label">Periudha e re</td><td class="chip-value">' . h(fmt_date_al((string)($data['service_from'] ?? null)) . ' → ' . fmt_date_al((string)($data['service_to'] ?? null))) . '</td></tr></table>
              </td>
            </tr>

            <tr>
              <td colspan="2">
                <div class="detail-box">
                  <table class="new-end-table">
                    <tr>
                      <td class="new-end-title">Skadimi i ri</td>
                      <td class="new-end-date">' . h(fmt_date_al((string)($data['service_to'] ?? null))) . '</td>
                    </tr>
                  </table>
                  <div class="muted-xs">
                    Baza e llogaritjes: ' . h(fmt_date_al((string)($data['service_from'] ?? null))) .
                    ' (+ ' . $monthsSel . ' muaj).
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <div class="calc-box">
            <div class="section-label">' . h($calculationTitle) . '</div>
            <div class="text-sm" style="margin-top:8px; color:#444444;">' . h($calculationText) . '</div>
          </div>
        </div>

        <div class="foot-note">
          Ky dokument është mandat pagese/Nuk është kupon fiskal .
        </div>
      </div>
    </div>
  </body>
  </html>';
}

$pdo = db();

try {
  $stmt = $pdo->prepare("
    SELECT
      p.*,
      c.first_name,
      c.last_name,
      c.phone AS customer_phone,
      c.connection_date,
      c.payment_status AS customer_payment_status,
      CONCAT(c.first_name, ' ', c.last_name) AS customer_name
    FROM payments p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.id = ?
    LIMIT 1
  ");
  $stmt->execute([$id]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    json_out(['ok' => false, 'error' => 'NOT_FOUND'], 404);
  }

  if ($token !== '') {
    $storedToken = (string)($row['receipt_token'] ?? '');

    if ($storedToken === '' || !hash_equals($storedToken, $token)) {
      json_out(['ok' => false, 'error' => 'NOT_FOUND'], 404);
    }
  } else {
    $u = require_auth();

    if (($u['role'] ?? '') !== 'admin' && (string)($row['point_name'] ?? '') !== (string)($u['point_name'] ?? '')) {
      json_out(['ok' => false, 'error' => 'FORBIDDEN'], 403);
    }
  }

  $dompdfOptions = new Options();
  $dompdfOptions->set('isRemoteEnabled', false);
  $dompdf = new Dompdf($dompdfOptions);

  $dompdf->loadHtml(render_receipt_html($row));
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();

  $pdfBinary = $dompdf->output();
  if ($pdfBinary === '') {
    json_out(['ok' => false, 'error' => 'EMPTY_PDF_OUTPUT'], 500);
  }

  $filename = trim((string)($row['receipt_no'] ?? ''));
  if ($filename === '') {
    $filename = 'mandat-pagese';
  }

  header_remove();
  header('Content-Type: application/pdf');
  header('Content-Disposition: attachment; filename="' . h($filename) . '.pdf"');
  header('Content-Length: ' . (string)strlen($pdfBinary));
  echo $pdfBinary;
  exit;
} catch (Throwable $e) {
  json_out([
    'ok' => false,
    'error' => 'SERVER_ERROR',
    'message' => $e->getMessage(),
  ], 500);
}