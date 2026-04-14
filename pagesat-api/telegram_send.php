<?php
declare(strict_types=1);

function telegram_send_message(string $text): bool
{
  // 🔴 Your credentials 
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