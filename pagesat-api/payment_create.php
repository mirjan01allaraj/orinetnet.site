<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
$u = require_auth();

header('Content-Type: application/json; charset=utf-8');

$in = read_json();

$customer_id     = (int)($in['customer_id'] ?? 0);
$package_code    = strtolower(trim((string)($in['package_code'] ?? '')));
$months_selected = (int)($in['months_selected'] ?? 0);
$amount_paid     = (int)($in['amount_paid'] ?? 0);
$expected_amount = (int)($in['expected_amount'] ?? 0);
$reason          = trim((string)($in['reason'] ?? ''));
$note            = trim((string)($in['note'] ?? ''));

$validPackages = ['standarte'=>1300,'smart'=>1400,'turbo'=>1500,'ultra'=>1700];

if (
  $customer_id <= 0 ||
  !isset($validPackages[$package_code]) ||
  $months_selected < 1 ||
  $months_selected > 12
) {
  json_out(['ok'=>false,'error'=>'INVALID_INPUT'], 400);
}

if ($amount_paid <= 0) {
  json_out(['ok'=>false,'error'=>'AMOUNT_REQUIRED'], 400);
}

// Promo logic
$months_paid = ($months_selected === 6)
  ? 5
  : (($months_selected === 12) ? 10 : $months_selected);

$package_price = $validPackages[$package_code];

if ($expected_amount <= 0) {
  $expected_amount = $package_price * $months_paid;
}

if ($amount_paid !== $expected_amount && $reason === '') {
  json_out(['ok'=>false,'error'=>'REASON_REQUIRED'], 400);
}
if ($reason === 'Tjetër' && $note === '') {
  json_out(['ok'=>false,'error'=>'NOTE_REQUIRED_FOR_OTHER'], 400);
}

function today_tirane(): DateTimeImmutable {
  return new DateTimeImmutable('today', new DateTimeZone('Europe/Tirane'));
}

function dt_or_null(?string $d): ?DateTimeImmutable {
  if (!$d) return null;
  try {
    return new DateTimeImmutable($d, new DateTimeZone('Europe/Tirane'));
  } catch (Throwable $e) {
    return null;
  }
}

function add_months_overflow(DateTimeImmutable $d, int $months): DateTimeImmutable {
  return $d->modify("+{$months} months");
}

function debt_days_from_to(DateTimeImmutable $from, DateTimeImmutable $to): int {
  if ($to <= $from) return 0;
  return (int)$from->diff($to)->format('%a');
}

function format_date_albanian_short(DateTimeImmutable $date): string {
  $months = [
    1 => 'Jan',
    2 => 'Shk',
    3 => 'Mar',
    4 => 'Pri',
    5 => 'Maj',
    6 => 'Qer',
    7 => 'Kor',
    8 => 'Gus',
    9 => 'Sht',
    10 => 'Tet',
    11 => 'Nën',
    12 => 'Dhj',
  ];

  $day = (int)$date->format('d');
  $month = (int)$date->format('m');
  $year = $date->format('Y');

  return "{$day} {$months[$month]} {$year}";
}

function telegram_send_message(string $text): bool {
  $botToken = "8638356116:AAFuAhtfr_YXDqCQDkjf5EpiE8OmIRzoH4g";
  $chatId   = "-4901714976";

  $url = "https://api.telegram.org/bot{$botToken}/sendMessage";

  $payload = [
    'chat_id' => $chatId,
    'text' => $text,
    'parse_mode' => 'HTML',
  ];

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_POSTFIELDS => http_build_query($payload),
  ]);

  $res = curl_exec($ch);
  $err = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($res === false || $err || $code >= 400) {
    error_log("Telegram send failed: " . ($err ?: "HTTP $code"));
    return false;
  }

  return true;
}

$pdo = db();

try {
  $pdo->beginTransaction();

  $cs = $pdo->prepare("
    SELECT
      id,
      first_name,
      last_name,
      connection_date,
      payment_status,
      paid_until,
      last_payment_date
    FROM customers
    WHERE id = ?
    FOR UPDATE
  ");
  $cs->execute([$customer_id]);
  $c = $cs->fetch();

  if (!$c) {
    $pdo->rollBack();
    json_out(['ok'=>false,'error'=>'CUSTOMER_NOT_FOUND'], 404);
  }

  $now = today_tirane();
  $today = $now->format('Y-m-d');

  $payment_status_before = strtolower(trim((string)($c['payment_status'] ?? 'manual')));
  if (!in_array($payment_status_before, ['manual', 'never_paid', 'free'], true)) {
    $payment_status_before = 'manual';
  }

  $connectionDate = dt_or_null($c['connection_date'] ?? null);
  $prevEnd = dt_or_null($c['paid_until'] ?? null);
  $prevLastPay = dt_or_null($c['last_payment_date'] ?? null);

  $hasPrevEnd = $prevEnd instanceof DateTimeImmutable;
  $hasConnectionDate = $connectionDate instanceof DateTimeImmutable;
  $isNeverPaid = ($payment_status_before === 'never_paid') || !$prevLastPay;

  $debt = 0;
  $service_from = $now;
  $calculation_mode = 'from_today_fallback';

  if ($hasPrevEnd) {
    $service_from = $prevEnd;
    $debt = debt_days_from_to($prevEnd, $now);
    $calculation_mode = ($debt > 0)
      ? 'debt_from_previous_paid_until'
      : 'extend_from_previous_paid_until';
  } elseif ($isNeverPaid && $hasConnectionDate) {
    $service_from = $connectionDate;
    $debt = debt_days_from_to($connectionDate, $now);
    $calculation_mode = 'from_connection_date_no_previous_payment';
  } elseif ($hasConnectionDate) {
    $service_from = $connectionDate;
    $debt = debt_days_from_to($connectionDate, $now);
    $calculation_mode = 'from_connection_date_fallback';
  } else {
    $service_from = $now;
    $debt = 0;
    $calculation_mode = 'from_today_fallback';
  }

  $service_to = add_months_overflow($service_from, $months_selected);

  // Receipt counter lock
  $lock = $pdo->prepare("SELECT last_number FROM receipt_counters WHERE counter_date=? FOR UPDATE");
  $lock->execute([$today]);
  $row = $lock->fetch();

  if (!$row) {
    $pdo->prepare("INSERT INTO receipt_counters (counter_date,last_number) VALUES (?,0)")
        ->execute([$today]);
    $last = 0;
  } else {
    $last = (int)$row['last_number'];
  }

  $next = $last + 1;
  $pdo->prepare("UPDATE receipt_counters SET last_number=? WHERE counter_date=?")
      ->execute([$next, $today]);

  $receipt_no = sprintf("ON-%s-%04d", $today, $next);

  $stmt = $pdo->prepare("
    INSERT INTO payments
      (customer_id, created_by_user_id, point_name,
       package_code, package_price, months_selected, months_paid,
       expected_amount, amount_paid, reason, note, method, receipt_no, receipt_date,
       service_from, service_to, debt_days,
       previous_paid_until, previous_last_payment_date)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cash', ?, ?, ?, ?, ?, ?, ?)
  ");

  $final_reason = ($amount_paid !== $expected_amount) ? $reason : 'Pagesë standarde';
  $final_note = ($note !== '' ? $note : null);

  $stmt->execute([
    $customer_id,
    (int)$u['id'],
    $u['point_name'],
    $package_code,
    $package_price,
    $months_selected,
    $months_paid,
    $expected_amount,
    $amount_paid,
    $final_reason,
    $final_note,
    $receipt_no,
    $today,
    $service_from->format('Y-m-d'),
    $service_to->format('Y-m-d'),
    $debt,
    ($prevEnd ? $prevEnd->format('Y-m-d') : null),
    ($prevLastPay ? $prevLastPay->format('Y-m-d') : null),
  ]);

  // Update customer after successful payment
  $up = $pdo->prepare("
    UPDATE customers
    SET current_package = ?,
        payment_status = 'manual',
        last_payment_date = ?,
        paid_until = ?
    WHERE id = ?
    LIMIT 1
  ");
  $up->execute([
    $package_code,
    $today,
    $service_to->format('Y-m-d'),
    $customer_id
  ]);

  $payment_id = (int)$pdo->lastInsertId();
  if ($payment_id <= 0) {
    $gid = $pdo->prepare("SELECT id FROM payments WHERE receipt_no = ? LIMIT 1");
    $gid->execute([$receipt_no]);
    $found = $gid->fetch();
    $payment_id = $found ? (int)$found['id'] : 0;
  }

  // PUBLIC RECEIPT TOKEN
  $receipt_token = '';
  if ($payment_id > 0) {
    $receipt_token = bin2hex(random_bytes(32));

    $updToken = $pdo->prepare("
      UPDATE payments
      SET receipt_token = ?
      WHERE id = ?
      LIMIT 1
    ");
    $updToken->execute([$receipt_token, $payment_id]);
  }

  $customer_name = trim(
    ((string)($c['first_name'] ?? '')) . ' ' . ((string)($c['last_name'] ?? ''))
  );
  if ($customer_name === '') {
    $customer_name = 'Klient pa emer';
  }

  $pdo->commit();

  if ($payment_id <= 0) {
    json_out(['ok'=>false,'error'=>'PAYMENT_ID_NOT_FOUND','receipt_no'=>$receipt_no], 500);
  }

  $isNegotiated = $amount_paid !== $expected_amount;

  $dateRow =
    "📆 <b>Datat:</b> " .
    format_date_albanian_short($service_from) .
    " → " .
    format_date_albanian_short($service_to);

  if ($debt > 0) {
    $dateRow .= " <b>(Borxh: {$debt} ditë)</b>";
  }

  $message =
    "💳 <b>Pagesë e re!</b>\n" .
    "📍 <b>Point:</b> <b>" . htmlspecialchars((string)$u['point_name'], ENT_QUOTES, 'UTF-8') . "</b>\n" .
    "──────────────\n" .
    "👤 <b>Klienti:</b> {$customer_name}\n" .
    "📦 <b>Paketa:</b> " . strtoupper($package_code) . "\n" .
    "📅 <b>Abonimi:</b> {$months_selected} muaj\n" .
    $dateRow . "\n";

  if ($isNegotiated) {
    $message .=
      "⚠️ <b>Pagesë jo standarde</b>\n" .
      "💰 <b>Standard:</b> <b>{$expected_amount} L</b>\n" .
      "💸 <b>Paguar:</b> <b>{$amount_paid} L</b>\n" .
      "📝 <b>Arsye:</b> " . htmlspecialchars($final_reason, ENT_QUOTES, 'UTF-8') . "\n";

    if ($final_note !== null) {
      $message .=
        "📄 <b>Shënim:</b> " . htmlspecialchars($final_note, ENT_QUOTES, 'UTF-8') . "\n";
    }
  } else {
    $message .=
      "💰 <b>Shuma:</b> <b>{$amount_paid} L</b>\n";
  }

  try {
    telegram_send_message($message);
  } catch (Throwable $e) {
    error_log("Telegram error: " . $e->getMessage());
  }

  $public_receipt_url = null;
  $public_pdf_url = null;

  if ($receipt_token !== '') {
    $public_receipt_url = '/pagesat/receipt-public/?id=' . $payment_id . '&token=' . $receipt_token;
    $public_pdf_url = '/pagesat-api/export_receipt_pdf.php?id=' . $payment_id . '&token=' . $receipt_token;
  }

  json_out([
    'ok' => true,
    'payment_id' => $payment_id,
    'receipt_no' => $receipt_no,
    'receipt_token' => ($receipt_token !== '' ? $receipt_token : null),
    'public_receipt_url' => $public_receipt_url,
    'public_pdf_url' => $public_pdf_url,
    'payment_status_before' => $payment_status_before,
    'connection_date' => ($connectionDate ? $connectionDate->format('Y-m-d') : null),
    'previous_last_payment_date' => ($prevLastPay ? $prevLastPay->format('Y-m-d') : null),
    'previous_paid_until' => ($prevEnd ? $prevEnd->format('Y-m-d') : null),
    'debt_days' => $debt,
    'calculation_mode' => $calculation_mode,
    'calculation_base' => $service_from->format('Y-m-d'),
    'service_from' => $service_from->format('Y-m-d'),
    'service_to' => $service_to->format('Y-m-d'),
  ]);

} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_out(['ok'=>false,'error'=>'SERVER_ERROR'], 500);
}