<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/_lib/receipt_qr.php';

$fake = [
    'id' => 66,
    'receipt_token' => '8ea54015a911c346026ec55da2d14f451c97306dc2ebdd628daa8037968380ed',
];

$qr = build_receipt_qr_data_uri($fake, 180);

echo '<!doctype html><html><body>';
echo '<p>QR test</p>';
echo $qr ? '<img src="' . htmlspecialchars($qr, ENT_QUOTES, 'UTF-8') . '">' : 'No QR';
echo '</body></html>';