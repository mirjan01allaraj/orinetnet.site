<?php
declare(strict_types=1);

function render_invoice_template(array $data): string
{
  $fmtMoney = function ($n): string {
    $num = (float)($n ?? 0);
    return number_format($num, 0, ',', ',') . ' L';
  };

  $fmtDate = function ($d): string {
    if (!$d) return '—';
    $s = (string)$d;
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $s, $m)) {
      return ((int)$m[3]) . '/' . ((int)$m[2]) . '/' . $m[1];
    }
    return $s;
  };

  $h = function ($v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
  };

  $pkgCode = strtoupper((string)($data['package_code'] ?? ''));
  $pkgPrice = (int)($data['package_price'] ?? 0);
  $monthsSel = (int)($data['months_selected'] ?? 0);
  $monthsPaid = (int)($data['months_paid'] ?? 0);
  $freeMonths = max(0, $monthsSel - $monthsPaid);
  $expected = (int)($data['expected_amount'] ?? 0);
  $paid = (int)($data['amount_paid'] ?? 0);
  $hasDeal = $paid !== $expected;

  $debtDays = (int)($data['debt_days'] ?? 0);
  $paymentStatusBefore = strtolower((string)($data['payment_status_before'] ?? $data['customer_payment_status'] ?? 'manual'));
  $previousLastPaymentDate = $data['previous_last_payment_date'] ?? null;
  $previousPaidUntil = $data['previous_paid_until'] ?? null;
  $connectionDate = $data['connection_date'] ?? $data['customer_connection_date'] ?? null;
  $startDate = $data['service_from'] ?? null;
  $endDate = $data['service_to'] ?? null;

  $lastPaymentLabel = '—';
  if ($paymentStatusBefore === 'never_paid' || (!$previousLastPaymentDate && $connectionDate)) {
    $lastPaymentLabel = 'Asnjë pagesë';
  } elseif ($paymentStatusBefore === 'free') {
    $lastPaymentLabel = 'Free';
  } elseif ($previousLastPaymentDate) {
    $lastPaymentLabel = $fmtDate($previousLastPaymentDate);
  }

  $calculationTitle = 'Llogaritja e skadimit';
  $calculationText = '';

  if ($previousPaidUntil && $debtDays > 0) {
    $calculationTitle = 'Llogaritja me vonesë';
    $calculationText = 'Klienti ka qenë me vonesë ' . $debtDays . ' ditë. Skadimi i ri është llogaritur nga skadimi i mëparshëm ' .
      $fmtDate($previousPaidUntil) . ' + ' . $monthsSel . ' muaj = ' . $fmtDate($endDate) . '.';
  } elseif ($previousPaidUntil && $debtDays <= 0) {
    $calculationTitle = 'Llogaritja për klient aktiv';
    $calculationText = 'Klienti ka qenë aktiv. Skadimi i ri është llogaritur nga skadimi aktual ' .
      $fmtDate($previousPaidUntil) . ' + ' . $monthsSel . ' muaj = ' . $fmtDate($endDate) . '.';
  } elseif ($connectionDate) {
    $calculationTitle = 'Llogaritja pa pagesë të mëparshme';
    $calculationText = 'Klienti nuk ka pasur pagesë të mëparshme. Skadimi i ri është llogaritur nga data e lidhjes ' .
      $fmtDate($connectionDate) . ' + ' . $monthsSel . ' muaj = ' . $fmtDate($endDate) . '.';
  } else {
    $calculationText = 'Skadimi i ri është llogaritur nga ' .
      $fmtDate($startDate) . ' + ' . $monthsSel . ' muaj = ' . $fmtDate($endDate) . '.';
  }

  $amountLine = '';
  if ($pkgPrice > 0 && $monthsSel > 0) {
    if ($hasDeal) {
      $amountLine = '
        <div class="amount-line amount-line-deal">
          <div>
            Çmimi standard: ' . $h(number_format($pkgPrice, 0, ',', ',')) . ' L × ' . $monthsPaid . ' muaj të paguar' .
            ($freeMonths > 0 ? ' (+ ' . $freeMonths . ' muaj falas)' : '') . ' = 
            <span class="amount-strong">' . $h(number_format($expected, 0, ',', ',')) . ' L</span>
          </div>
          <div class="deal-box">
            Shuma e rënë dakord: <span class="amount-strong">' . $h(number_format($paid, 0, ',', ',')) . ' L</span>
          </div>
        </div>';
    } else {
      $amountLine = '
        <div class="amount-line">
          ' . $h(number_format($pkgPrice, 0, ',', ',')) . ' L × ' . $monthsPaid . ' muaj të paguar' .
          ($freeMonths > 0 ? ' (+ ' . $freeMonths . ' muaj falas)' : '') . ' = 
          <span class="amount-strong">' . $h(number_format($paid, 0, ',', ',')) . ' L</span>
        </div>';
    }
  }

  $badgeClass = $debtDays > 0 ? 'badge-debt' : 'badge-ok';
  $badgeText = $debtDays > 0 ? 'VONË: ' . $debtDays . ' ditë' : 'PA VONESË';

  return '<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Konfirmim Pagese</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111111;
      font-family: DejaVu Sans, sans-serif;
      font-size: 12px;
      line-height: 1.35;
    }

    .receipt-sheet {
      width: 100%;
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 16px;
      overflow: hidden;
    }

    .receipt-header {
      background: #000000;
      color: #ffffff;
      padding: 18px 20px;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
    }

    .header-left {
      width: 62%;
      vertical-align: top;
    }

    .header-right {
      width: 38%;
      vertical-align: top;
      text-align: right;
    }

    .receipt-title-big {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
      line-height: 1.05;
    }

    .receipt-title-mid {
      font-size: 20px;
      font-weight: 700;
      margin-top: 4px;
    }

    .receipt-text-sm {
      font-size: 12px;
      color: rgba(255,255,255,0.78);
      margin-top: 3px;
    }

    .receipt-text-xs {
      font-size: 11px;
      color: rgba(255,255,255,0.72);
      text-transform: uppercase;
      letter-spacing: 1.4px;
    }

    .receipt-body {
      padding: 18px;
    }

    .two-col {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .two-col td {
      width: 50%;
      vertical-align: top;
    }

    .two-col td:first-child {
      padding-right: 8px;
    }

    .two-col td:last-child {
      padding-left: 8px;
    }

    .receipt-card,
    .receipt-section-box {
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 16px;
      padding: 16px;
    }

    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(0,0,0,0.60);
      margin-bottom: 6px;
    }

    .client-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .client-phone {
      font-size: 13px;
      color: rgba(0,0,0,0.72);
      margin-bottom: 12px;
    }

    .chip {
      width: 100%;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 10px;
      background: rgba(0,0,0,0.02);
      padding: 9px 12px;
      margin-top: 8px;
    }

    .chip-table {
      width: 100%;
      border-collapse: collapse;
    }

    .chip-left {
      color: rgba(0,0,0,0.60);
      vertical-align: top;
    }

    .chip-right {
      text-align: right;
      font-weight: 700;
      vertical-align: top;
    }

    .receipt-main-total {
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 16px;
      background: rgba(0,0,0,0.02);
      padding: 16px;
      margin-top: 10px;
    }

    .main-total-label {
      color: rgba(0,0,0,0.60);
      font-size: 13px;
    }

    .receipt-big-money {
      margin-top: 4px;
      font-size: 40px;
      font-weight: 800;
      line-height: 1;
    }

    .amount-line {
      margin-top: 10px;
      font-size: 11px;
      color: rgba(0,0,0,0.64);
      line-height: 1.45;
    }

    .amount-line-deal {
      margin-top: 10px;
      font-size: 11px;
      color: rgba(0,0,0,0.68);
      line-height: 1.45;
    }

    .deal-box {
      margin-top: 6px;
      border: 1px solid #f1c04a;
      background: #fff5d7;
      color: #9a6700;
      padding: 8px 10px;
      border-radius: 10px;
    }

    .amount-strong {
      font-weight: 700;
      color: #111111;
    }

    .receipt-section-box {
      margin-top: 14px;
    }

    .section-head-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }

    .section-head-left {
      vertical-align: middle;
    }

    .section-head-right {
      text-align: right;
      vertical-align: middle;
    }

    .receipt-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .badge-debt {
      border-color: #f3b4b4;
      background: #fff0f0;
      color: #c53030;
    }

    .badge-ok {
      border-color: #9ae6b4;
      background: #f0fff4;
      color: #2f855a;
    }

    .detail-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .detail-grid td {
      width: 50%;
      vertical-align: top;
      padding-bottom: 8px;
    }

    .detail-grid td:first-child {
      padding-right: 6px;
    }

    .detail-grid td:last-child {
      padding-left: 6px;
    }

    .receipt-detail-box {
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 14px;
      background: rgba(0,0,0,0.03);
      padding: 14px;
      margin-top: 4px;
    }

    .detail-box-table {
      width: 100%;
      border-collapse: collapse;
    }

    .detail-box-left {
      vertical-align: top;
    }

    .detail-box-right {
      vertical-align: top;
      text-align: right;
    }

    .detail-box-title {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.1;
    }

    .receipt-big-date {
      font-size: 40px;
      font-weight: 800;
      line-height: 1;
    }

    .detail-sub {
      margin-top: 4px;
      font-size: 11px;
      color: rgba(0,0,0,0.60);
    }

    .calculation-box {
      margin-top: 12px;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 14px;
      padding: 14px;
      background: #ffffff;
    }

    .calculation-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(0,0,0,0.60);
      margin-bottom: 8px;
    }

    .calculation-text {
      font-size: 13px;
      color: rgba(0,0,0,0.84);
      line-height: 1.55;
    }

    .receipt-foot-note {
      margin-top: 14px;
      border: 1px solid rgba(0,0,0,0.10);
      border-radius: 12px;
      background: rgba(0,0,0,0.02);
      padding: 10px 12px;
      text-align: center;
      font-size: 11px;
      color: rgba(0,0,0,0.70);
    }
  </style>
</head>
<body>
  <div class="receipt-sheet">
    <div class="receipt-header">
      <table class="header-table">
        <tr>
          <td class="header-left">
            <div class="receipt-title-big">ORIENT NET ISP</div>
            <div class="receipt-text-sm">NIPT: M32217031B</div>
            <div class="receipt-text-sm">Adresa: Rr “Demokracia”, Paskuqan 2, Tiranë</div>
          </td>
          <td class="header-right">
            <div class="receipt-text-xs">Konfirmim Pagese</div>
            <div class="receipt-title-mid">' . $h($data['receipt_no'] ?? '') . '</div>
            <div class="receipt-text-sm">' . $h((string)($data['created_at'] ?? $data['receipt_date'] ?? '')) . '</div>
            <div class="receipt-text-sm">Pika: ' . $h($data['point_name'] ?? '') . '</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="receipt-body">
      <table class="two-col">
        <tr>
          <td>
            <div class="receipt-card">
              <div class="section-label">Klienti</div>
              <div class="client-name">' . $h($data['customer_name'] ?? '') . '</div>
              <div class="client-phone"><b>Tel:</b> ' . $h($data['customer_phone'] ?: '—') . '</div>

              ' . chip_html('Paketa', $pkgCode . ' (' . number_format($pkgPrice, 0, ',', ',') . ' L / muaj)') . '
              ' . chip_html('Abonimi', $monthsSel . ' muaj') . '
              ' . chip_html('Muaj të paguar', (string)$monthsPaid) . '
              ' . ($freeMonths > 0 ? chip_html('Muaj falas', (string)$freeMonths) : '') . '
              ' . chip_html('Shuma standarde', $fmtMoney($expected)) . '
              ' . chip_html($hasDeal ? 'Shuma e paguar (marrëveshje)' : 'Shuma e paguar', $fmtMoney($paid)) . '
              ' . $amountLine . '
            </div>
          </td>

          <td>
            <div class="receipt-card">
              <div class="section-label">Pagesa</div>

              <div class="receipt-main-total">
                <div class="main-total-label">' . ($hasDeal ? 'Shuma e rënë dakord' : 'Totali i paguar') . '</div>
                <div class="receipt-big-money">' . $fmtMoney($paid) . '</div>
              </div>

              ' . chip_html('Arsyeja', (string)($data['reason'] ?? 'Pagesë standarde')) . '
              ' . (!empty($data['note']) ? chip_html('Shënim', (string)$data['note']) : '') . '
            </div>
          </td>
        </tr>
      </table>

      <div class="receipt-section-box">
        <table class="section-head-table">
          <tr>
            <td class="section-head-left">
              <div class="section-label" style="margin-bottom:0;">Detaje abonimi</div>
            </td>
            <td class="section-head-right">
              <span class="receipt-badge ' . $badgeClass . '">' . $h($badgeText) . '</span>
            </td>
          </tr>
        </table>

        <table class="detail-grid">
          <tr>
            <td>' . chip_html('Data e lidhjes', $fmtDate($connectionDate)) . '</td>
            <td>' . chip_html('Pagesa e fundit (para pagesës)', $lastPaymentLabel) . '</td>
          </tr>
          <tr>
            <td>' . chip_html('Skadimi aktual (para pagesës)', $fmtDate($previousPaidUntil)) . '</td>
            <td>' . chip_html('Periudha e re', $fmtDate($startDate) . ' → ' . $fmtDate($endDate)) . '</td>
          </tr>
        </table>

        <div class="receipt-detail-box">
          <table class="detail-box-table">
            <tr>
              <td class="detail-box-left">
                <div class="detail-box-title">Skadimi i ri</div>
                <div class="detail-sub">Baza e llogaritjes: ' . $fmtDate($startDate) . ' (+ ' . $monthsSel . ' muaj).</div>
              </td>
              <td class="detail-box-right">
                <div class="receipt-big-date">' . $fmtDate($endDate) . '</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="calculation-box">
          <div class="calculation-title">' . $h($calculationTitle) . '</div>
          <div class="calculation-text">' . $h($calculationText) . '</div>
        </div>
      </div>

      <div class="receipt-foot-note">
        Ky dokument nuk është kupon fiskal.
      </div>
    </div>
  </div>
</body>
</html>';
}

function chip_html(string $label, string $value): string
{
  return '
    <div class="chip">
      <table class="chip-table">
        <tr>
          <td class="chip-left">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</td>
          <td class="chip-right">' . htmlspecialchars($value !== '' ? $value : '—', ENT_QUOTES, 'UTF-8') . '</td>
        </tr>
      </table>
    </div>';
}