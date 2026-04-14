<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_role('admin');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'METHOD_NOT_ALLOWED'], 405);
if (!isset($_FILES['file'])) json_out(['ok'=>false,'error'=>'NO_FILE'], 400);

$tmp = $_FILES['file']['tmp_name'];
$name = $_FILES['file']['name'] ?? '';
if (!str_ends_with(strtolower($name), '.xlsx')) json_out(['ok'=>false,'error'=>'ONLY_XLSX'], 400);
if (!class_exists('ZipArchive')) json_out(['ok'=>false,'error'=>'ZIPARCHIVE_MISSING'], 500);

$action = trim((string)($_POST['action'] ?? 'preview')); // count | preview | import

$page = max(1, (int)($_POST['page'] ?? 1));
$pageSize = max(1, min(200, (int)($_POST['page_size'] ?? 50)));

$chunkSize = max(10, min(1000, (int)($_POST['chunk_size'] ?? 200)));
$dryRun = (int)($_POST['dry_run'] ?? 0); // import default 0

/**
 * Utilities
 */
function norm_header(string $s): string {
  $s = trim(mb_strtolower($s));
  $s = preg_replace('/\s+/', ' ', $s);
  $s = str_replace([':', ';', '.', ',', '-', '_', '/', '\\'], ' ', $s);
  $s = preg_replace('/\s+/', ' ', $s);
  return trim($s);
}
function to_upper_name(string $s): string {
  $s = trim($s);
  if ($s === '') return '';
  return mb_strtoupper($s, 'UTF-8');
}
function clean_phone(?string $s): ?string {
  if ($s === null) return null;
  $s = trim($s);
  $s = preg_replace('/\s+/', '', $s);
  $s = preg_replace('/[^\d\+]/', '', $s);
  return $s !== '' ? $s : null;
}
function is_empty_row(array $cells): bool {
  foreach ($cells as $v) {
    if (trim((string)$v) !== '') return false;
  }
  return true;
}
function valid_package(string $p): string {
  $p = strtolower(trim($p));
  $valid = ['standarte','smart','turbo','ultra'];
  return in_array($p, $valid, true) ? $p : 'standarte';
}

/**
 * XLSX streaming reader (ZipArchive + XMLReader)
 * Robust:
 * - finds the first worksheet path via workbook.xml + rels
 * - finds header as first non-empty row in first N rows (not only row 1)
 */
final class XlsxStream {
  private ZipArchive $zip;
  private array $shared = [];
  private string $sheetPath; // e.g. xl/worksheets/sheet1.xml

  public function __construct(string $path) {
    $this->zip = new ZipArchive();
    if ($this->zip->open($path) !== true) {
      throw new RuntimeException('CANNOT_OPEN_XLSX');
    }
    $this->loadSharedStrings();
    $this->sheetPath = $this->detectFirstSheetPath();
  }

  public function close(): void {
    $this->zip->close();
  }

  private function loadSharedStrings(): void {
    $idx = $this->zip->locateName('xl/sharedStrings.xml');
    if ($idx === false) { $this->shared = []; return; }
    $xml = $this->zip->getFromIndex($idx);
    if ($xml === false) { $this->shared = []; return; }

    $r = new XMLReader();
    $r->XML($xml, null, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);

    $cur = '';
    while ($r->read()) {
      if ($r->nodeType === XMLReader::ELEMENT && $r->name === 't') {
        $cur .= $r->readInnerXML();
      }
      if ($r->nodeType === XMLReader::END_ELEMENT && $r->name === 'si') {
        $this->shared[] = html_entity_decode($cur, ENT_QUOTES | ENT_XML1, 'UTF-8');
        $cur = '';
      }
    }
    $r->close();
  }

  private function getZipText(string $name): ?string {
    $idx = $this->zip->locateName($name);
    if ($idx === false) return null;
    $xml = $this->zip->getFromIndex($idx);
    if ($xml === false) return null;
    return $xml;
  }

  /**
   * Find first worksheet path using:
   * - xl/workbook.xml for sheets + r:id
   * - xl/_rels/workbook.xml.rels to map r:id -> Target
   */
  private function detectFirstSheetPath(): string {
    $wb = $this->getZipText('xl/workbook.xml');
    $rels = $this->getZipText('xl/_rels/workbook.xml.rels');

    // Fallback
    if ($wb === null || $rels === null) {
      if ($this->zip->locateName('xl/worksheets/sheet1.xml') !== false) return 'xl/worksheets/sheet1.xml';
      throw new RuntimeException('WORKBOOK_NOT_FOUND');
    }

    // Parse rels: Id -> Target
    $relMap = [];
    $xr = new XMLReader();
    $xr->XML($rels, null, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    while ($xr->read()) {
      if ($xr->nodeType === XMLReader::ELEMENT && $xr->name === 'Relationship') {
        $id = (string)$xr->getAttribute('Id');
        $target = (string)$xr->getAttribute('Target'); // e.g. worksheets/sheet1.xml
        if ($id !== '' && $target !== '') $relMap[$id] = $target;
      }
    }
    $xr->close();

    // Parse workbook, get first sheet r:id
    $firstRid = null;
    $xr = new XMLReader();
    $xr->XML($wb, null, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    while ($xr->read()) {
      if ($xr->nodeType === XMLReader::ELEMENT && $xr->name === 'sheet') {
        $rid = (string)$xr->getAttribute('r:id'); // namespaced attr, but XMLReader returns it like this
        if ($rid === '') {
          // sometimes it appears as "id" with prefix removed; try also "id"
          $rid = (string)$xr->getAttribute('id');
        }
        if ($rid !== '') { $firstRid = $rid; break; }
      }
    }
    $xr->close();

    if ($firstRid && isset($relMap[$firstRid])) {
      $target = $relMap[$firstRid];
      // Target is relative to xl/
      $path = 'xl/' . ltrim($target, '/');
      if ($this->zip->locateName($path) !== false) return $path;
    }

    // fallback to sheet1
    if ($this->zip->locateName('xl/worksheets/sheet1.xml') !== false) return 'xl/worksheets/sheet1.xml';

    // last fallback: find any sheet in xl/worksheets/
    for ($i=0; $i<$this->zip->numFiles; $i++) {
      $stat = $this->zip->statIndex($i);
      $n = $stat['name'] ?? '';
      if (str_starts_with($n, 'xl/worksheets/') && str_ends_with($n, '.xml')) {
        return $n;
      }
    }

    throw new RuntimeException('SHEET_NOT_FOUND');
  }

  private function openSheet(): XMLReader {
    $xml = $this->getZipText($this->sheetPath);
    if ($xml === null) throw new RuntimeException('SHEET_READ_FAILED');

    $r = new XMLReader();
    $r->XML($xml, null, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
    return $r;
  }

  /**
   * Reads a row element and returns array letter=>value
   */
  private function readRowCells(XMLReader $reader): array {
    $cells = [];
    $depth = $reader->depth;

    while ($reader->read()) {
      if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'c') {
        $ref = (string)$reader->getAttribute('r'); // e.g. A12
        $type = (string)$reader->getAttribute('t'); // s / inlineStr / etc
        $letter = preg_replace('/\d+/', '', $ref);

        $val = '';
        $cellDepth = $reader->depth;

        while ($reader->read()) {
          if ($reader->nodeType === XMLReader::ELEMENT && ($reader->name === 'v' || $reader->name === 't')) {
            $inner = $reader->readInnerXML();
            $val = html_entity_decode($inner, ENT_QUOTES | ENT_XML1, 'UTF-8');
          }
          if ($reader->nodeType === XMLReader::END_ELEMENT && $reader->depth === $cellDepth && $reader->name === 'c') {
            break;
          }
        }

        if ($type === 's') {
          $idx = (int)$val;
          $val = $this->shared[$idx] ?? '';
        }

        $cells[$letter] = $val;
      }

      if ($reader->nodeType === XMLReader::END_ELEMENT && $reader->depth === $depth && $reader->name === 'row') {
        break;
      }
    }

    return $cells;
  }

  private function skipCurrentRow(XMLReader $reader): void {
    $depth = $reader->depth;
    while ($reader->read()) {
      if ($reader->nodeType === XMLReader::END_ELEMENT && $reader->depth === $depth && $reader->name === 'row') {
        break;
      }
    }
  }

  /**
   * Detect header row as first non-empty row within first $maxScan rows.
   * Returns header row number and columns mapping.
   */
  public function detectColumns(int $maxScan = 50): array {
    $reader = $this->openSheet();

    $headerCells = [];
    $headerRowNum = null;
    $scanned = 0;

    while ($reader->read()) {
      if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'row') {
        $scanned++;
        $rAttr = (string)$reader->getAttribute('r');
        $rowNum = ($rAttr !== '') ? (int)$rAttr : $scanned;

        $cells = $this->readRowCells($reader);

        if (!is_empty_row($cells)) {
          $headerCells = $cells;
          $headerRowNum = $rowNum;
          break;
        }

        if ($scanned >= $maxScan) break;
      }
    }
    $reader->close();

    // normalize headers
    $headerNorm = [];
    foreach ($headerCells as $letter => $val) {
      $headerNorm[$letter] = norm_header((string)$val);
    }

    $colFirst = null;
    $colLast  = null;
    $colPhone = null;

    foreach ($headerNorm as $letter => $h) {
      if ($colFirst === null && (str_contains($h, 'emri') || str_contains($h, 'emer'))) {
        $colFirst = $letter; continue;
      }
      if ($colLast === null && (str_contains($h, 'mbiemri') || str_contains($h, 'mbiemer'))) {
        $colLast = $letter; continue;
      }
      if ($colPhone === null && (str_contains($h, 'tel') || str_contains($h, 'telefon'))) {
        $colPhone = $letter; continue;
      }
      if ($colPhone === null && (str_contains($h, 'nr cel') || str_contains($h, 'nr. cel') || str_contains($h, 'cel'))) {
        $colPhone = $letter; continue;
      }
    }

// Special case: one column "emri mbiemri" (also supports emer/mbiemer)
$colFull = null;
foreach ($headerNorm as $letter => $h) {
  $hasFirst = (str_contains($h, 'emri') || str_contains($h, 'emer'));
  $hasLast  = (str_contains($h, 'mbiemri') || str_contains($h, 'mbiemer'));
  if ($hasFirst && $hasLast) {
    $colFull = $letter;
    break;
  }
}

// If full-name column exists, ignore separate first/last detection
if ($colFull !== null) {
  $colFirst = null;
  $colLast  = null;
}

    return [
      'header' => $headerCells,
      'header_row' => $headerRowNum ?? 1,
      'cols' => [
        'first' => $colFirst,
        'last' => $colLast,
        'phone' => $colPhone,
        'full' => $colFull,
      ],
      'sheet_path' => $this->sheetPath,
    ];
  }

  /**
   * Read slice of rows by row index >= startRow, maxRows.
   */
  public function readRowsSlice(int $startRow, int $maxRows): array {
    $reader = $this->openSheet();
    $out = [];

    while ($reader->read()) {
      if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'row') {
        $rAttr = (string)$reader->getAttribute('r');
        $rowNum = ($rAttr !== '') ? (int)$rAttr : 0;

        if ($rowNum !== 0 && $rowNum < $startRow) {
          $this->skipCurrentRow($reader);
          continue;
        }

        $cells = $this->readRowCells($reader);

        // If rowNum missing, we can't compare reliably. In practice it's almost always present.
        if ($rowNum === 0) {
          // best effort: just push
          $out[] = $cells;
        } else {
          $out[$rowNum] = $cells;
        }

        if (count($out) >= $maxRows) break;
      }
    }

    $reader->close();
    return $out;
  }

  /**
   * Accurate total non-empty data rows count after header.
   */
  public function countDataRowsAfter(int $dataStartRow): int {
    $reader = $this->openSheet();
    $count = 0;

    while ($reader->read()) {
      if ($reader->nodeType === XMLReader::ELEMENT && $reader->name === 'row') {
        $rAttr = (string)$reader->getAttribute('r');
        $rowNum = ($rAttr !== '') ? (int)$rAttr : 0;

        $cells = $this->readRowCells($reader);

        if ($rowNum !== 0 && $rowNum >= $dataStartRow && !is_empty_row($cells)) {
          $count++;
        }
      }
    }

    $reader->close();
    return $count;
  }
}

/**
 * Parse a customer row based on detected columns.
 */
function parse_customer_from_cells(array $cells, array $cols): array {
  $first = '';
  $last = '';
  $phone = null;

  if (!empty($cols['full'])) {
    $v = trim((string)($cells[$cols['full']] ?? ''));
    if ($v !== '') {
      $parts = preg_split('/\s+/', $v);
      $first = $parts[0] ?? '';
      $last = trim(implode(' ', array_slice($parts, 1)));
    }
  } else {
    $first = trim((string)($cells[$cols['first']] ?? ''));
    $last  = trim((string)($cells[$cols['last']] ?? ''));
  }

  if (!empty($cols['phone'])) {
    $phone = clean_phone((string)($cells[$cols['phone']] ?? ''));
  }

  $first = to_upper_name($first);
  $last  = to_upper_name($last);

  return [$first, $last, $phone];
}

try {
  $xlsx = new XlsxStream($tmp);
  $meta = $xlsx->detectColumns(80);
  $cols = $meta['cols'];
  $headerRow = (int)($meta['header_row'] ?? 1);
  $dataStartRow = $headerRow + 1;

  $hasFull = !empty($cols['full']);
  $hasSeparate = !empty($cols['first']) && !empty($cols['last']);

  if (!$hasFull && !$hasSeparate) {
    $xlsx->close();
    json_out([
      'ok'=>false,
      'error'=>'MISSING_COLUMNS',
      'need'=>['Emri + Mbiemri + Tel/Telefoni (ose Emri Mbiemri në një kolonë)'],
      'found'=>[
        'sheet'=>$meta['sheet_path'],
        'header_row'=>$headerRow,
        'header'=>$meta['header'],
        'cols'=>$cols
      ]
    ], 400);
  }

  $current_package = valid_package((string)($_POST['current_package'] ?? 'standarte'));

  // ✅ COUNT
  if ($action === 'count') {
    $total = $xlsx->countDataRowsAfter($dataStartRow);
    $xlsx->close();
    json_out([
      'ok'=>true,
      'total_rows'=>$total,
      'header_row'=>$headerRow,
      'data_start_row'=>$dataStartRow,
      'cols'=>$cols
    ]);
  }

  // ✅ PREVIEW (paginated + status)
  if ($action === 'preview') {
    $totalRows = (int)($_POST['total_rows'] ?? 0);
    if ($totalRows <= 0) $totalRows = $xlsx->countDataRowsAfter($dataStartRow);

    $startRow = $dataStartRow + (($page - 1) * $pageSize);
    $slice = $xlsx->readRowsSlice($startRow, $pageSize);

    // collect phones for DB duplicate check
    $phones = [];
    foreach ($slice as $rowNum => $cells) {
      if (is_empty_row($cells)) continue;
      [, , $phone] = parse_customer_from_cells($cells, $cols);
      if ($phone) $phones[] = $phone;
    }
    $phones = array_values(array_unique($phones));

    $existing = [];
    if (count($phones) > 0) {
      $pdo = db();
      $in = implode(',', array_fill(0, count($phones), '?'));
      $stmt = $pdo->prepare("SELECT phone FROM customers WHERE phone IN ($in)");
      $stmt->execute($phones);
      foreach ($stmt->fetchAll() as $r) {
        $p = (string)($r['phone'] ?? '');
        if ($p !== '') $existing[$p] = true;
      }
    }

    $seenInPage = [];
    $preview = [];

    foreach ($slice as $rowNum => $cells) {
      if (is_empty_row($cells)) continue;

      [$first, $last, $phone] = parse_customer_from_cells($cells, $cols);

      $status = "PENDING";
      if ($first === '' || $last === '') {
        $status = "INVALID";
      } else if ($phone && (isset($existing[$phone]) || isset($seenInPage[$phone]))) {
        $status = "DUPLICATE_PHONE";
      } else {
        $status = "WILL_INSERT";
      }

      if ($phone) $seenInPage[$phone] = true;

      $preview[] = [
        'row' => is_int($rowNum) ? $rowNum : 0,
        'first_name' => $first,
        'last_name' => $last,
        'phone' => $phone,
        'current_package' => $current_package,
        'status' => $status,
      ];
    }

    $xlsx->close();

    json_out([
      'ok'=>true,
      'page'=>$page,
      'page_size'=>$pageSize,
      'total_rows'=>$totalRows,
      'header_row'=>$headerRow,
      'data_start_row'=>$dataStartRow,
      'start_row'=>$startRow,
      'rows_returned'=>count($preview),
      'cols'=>$cols,
      'preview'=>$preview
    ]);
  }

  // ✅ IMPORT (chunked + accurate progress)
  if ($action === 'import') {
    $pdo = db();

    $ins = $pdo->prepare("
      INSERT INTO customers (first_name, last_name, phone, current_package)
      VALUES (?, ?, ?, ?)
    ");

    $inserted = 0;
    $skipped = 0;
    $errors = 0;

    $totalRows = (int)($_POST['total_rows'] ?? 0);
    if ($totalRows <= 0) $totalRows = $xlsx->countDataRowsAfter($dataStartRow);

    // cursor must not start before dataStartRow
    $cursorIn = (int)($_POST['cursor'] ?? $dataStartRow);
    $cursor = max($dataStartRow, $cursorIn);

    $slice = $xlsx->readRowsSlice($cursor, $chunkSize);
    $lastRowProcessed = $cursor - 1;

    foreach ($slice as $rowNum => $cells) {
      $lastRowProcessed = is_int($rowNum) ? $rowNum : $lastRowProcessed + 1;

      if (is_empty_row($cells)) { $errors++; continue; }

      [$first, $last, $phone] = parse_customer_from_cells($cells, $cols);
      if ($first === '' || $last === '') { $errors++; continue; }

      if ($dryRun === 1) { $inserted++; continue; }

      try {
        $ins->execute([$first, $last, $phone, $current_package]);
        $inserted++;
      } catch (PDOException $e) {
        $msg = $e->getMessage();
        if (str_contains($msg, 'uq_customers_phone') || str_contains($msg, 'Duplicate')) $skipped++;
        else $errors++;
      }
    }

    $xlsx->close();

    $nextCursor = $lastRowProcessed + 1;

    // processed rows estimate based on row index range from dataStartRow
    $processed = max(0, $nextCursor - $dataStartRow);
    $progress = ($totalRows > 0) ? (int)round(min(100, ($processed / $totalRows) * 100)) : 0;
$done = count($slice) < $chunkSize;

// ✅ Refresh list_nr only when the whole import is finished (and only real import)
if ($dryRun !== 1 && $done) {
  try {
    $pdo->beginTransaction();

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
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // mos e blloko importin, thjesht numërimi s'u rifreskua
    // mund ta logosh nëse ke logger
  }
}
    json_out([
      'ok'=>true,
      'inserted'=>$inserted,
      'skipped_duplicates'=>$skipped,
      'errors'=>$errors,
      'next_cursor'=>$nextCursor,
      'progress_percent'=>$progress,
      'total_rows'=>$totalRows,
      'header_row'=>$headerRow,
      'data_start_row'=>$dataStartRow,
      'done'=> count($slice) < $chunkSize
    ]);
  }

  $xlsx->close();
  json_out(['ok'=>false,'error'=>'UNKNOWN_ACTION'], 400);

} catch (Throwable $e) {
  json_out(['ok'=>false,'error'=>'IMPORT_FAILED','detail'=>$e->getMessage()], 500);
}