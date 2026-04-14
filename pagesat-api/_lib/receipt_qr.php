<?php
declare(strict_types=1);

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\PngWriter;

function build_receipt_public_pdf_url(array $payment): string
{
    $existing = trim((string)($payment['public_pdf_url'] ?? ''));
    if ($existing !== '') {
        return $existing;
    }

    $id = (int)($payment['id'] ?? 0);
    $token = trim((string)($payment['receipt_token'] ?? ''));

    if ($id <= 0 || $token === '') {
        return '';
    }

    return 'https://orientnet.al/pagesat-api/export_receipt_pdf.php?id='
        . rawurlencode((string)$id)
        . '&token='
        . rawurlencode($token);
}

function build_receipt_qr_data_uri(array $payment, int $size = 180): ?string
{
    $url = build_receipt_public_pdf_url($payment);
    if ($url === '') {
        return null;
    }

    $result = Builder::create()
        ->writer(new PngWriter())
        ->data($url)
        ->size($size)
        ->margin(8)
        ->build();

    return 'data:image/png;base64,' . base64_encode($result->getString());
}