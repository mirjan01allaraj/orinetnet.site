<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Dompdf\Dompdf;

$dompdf = new Dompdf();
$dompdf->loadHtml('<h1>PDF OK</h1><p>Dompdf po punon.</p>');
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

header('Content-Type: application/pdf');
echo $dompdf->output();