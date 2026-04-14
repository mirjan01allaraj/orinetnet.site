import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type ByItem = { key: string; total: number; count: number };
type TrendItem = { day: string; total: number; count: number };

function fmtL(n: number) {
  return Number(n || 0).toLocaleString("sq-AL") + " L";
}

function safeNum(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function styleSheet(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).alignment = { vertical: "middle" };
  ws.getRow(1).height = 18;

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    cell.border = {
      top: { style: "thin", color: { argb: "33FFFFFF" } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      bottom: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "22FFFFFF" } },
        left: { style: "thin", color: { argb: "22FFFFFF" } },
        bottom: { style: "thin", color: { argb: "22FFFFFF" } },
        right: { style: "thin", color: { argb: "22FFFFFF" } },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
}

function autosize(ws: ExcelJS.Worksheet, max = 48) {
  ws.columns.forEach((col) => {
    let m = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value as any;
      const s = v == null ? "" : String((v as any).text ?? v);
      m = Math.max(m, Math.min(max, s.length + 2));
    });
    col.width = m;
  });
}

async function addPng(ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook, base64Png: string, rowTop: number) {
  const imgId = wb.addImage({ base64: base64Png, extension: "png" });
  ws.addImage(imgId, { tl: { col: 5, row: rowTop }, ext: { width: 520, height: 300 } });
}

export async function exportReportsExcel(opts: {
  fileName: string;
  periodLabel: string;
  pointLabel: string;
  totalAmount: number;
  totalCount: number;
  byPoint: ByItem[];
  byPackage: ByItem[];
  trend: TrendItem[];
  // chart images
  linePng?: string;
  pointPiePng?: string;
  packagePiePng?: string;
  // raw (optional)
  rawRows?: any[];
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pagesat";
  wb.created = new Date();

  // --- Sheet 1: Revenue Trend
  const s1 = wb.addWorksheet("Revenue Trend");
  s1.addRow(["Range", opts.periodLabel, "", "Pika", opts.pointLabel]);
  s1.addRow(["Totali", fmtL(opts.totalAmount), "", "Pagesa", String(opts.totalCount || 0)]);
  s1.addRow([]);
  s1.addRow(["Dita", "Të ardhurat (L)", "Nr pagesash"]);

  for (const t of opts.trend) {
    s1.addRow([t.day, safeNum(t.total), safeNum(t.count)]);
  }

  s1.getColumn(2).numFmt = '#,##0" L"';
  styleSheet(s1);
  autosize(s1);

  if (opts.linePng) await addPng(s1, wb, opts.linePng, 0);

  // --- Sheet 2: By Point
  const s2 = wb.addWorksheet("By Point");
  s2.addRow(["Range", opts.periodLabel, "", "Pika", opts.pointLabel]);
  s2.addRow(["Totali", fmtL(opts.totalAmount), "", "Pagesa", String(opts.totalCount || 0)]);
  s2.addRow([]);
  s2.addRow(["Pika", "Të ardhurat (L)", "Nr pagesash"]);

  for (const p of opts.byPoint) {
    s2.addRow([p.key || "Pa pikë", safeNum(p.total), safeNum(p.count)]);
  }

  s2.getColumn(2).numFmt = '#,##0" L"';
  styleSheet(s2);
  autosize(s2);

  if (opts.pointPiePng) await addPng(s2, wb, opts.pointPiePng, 0);

  // --- Sheet 3: By Package
  const s3 = wb.addWorksheet("By Package");
  s3.addRow(["Range", opts.periodLabel, "", "Pika", opts.pointLabel]);
  s3.addRow(["Totali", fmtL(opts.totalAmount), "", "Pagesa", String(opts.totalCount || 0)]);
  s3.addRow([]);
  s3.addRow(["Paketa", "Të ardhurat (L)", "Nr pagesash"]);

  for (const pk of opts.byPackage) {
    s3.addRow([String(pk.key || "").toUpperCase() || "N/A", safeNum(pk.total), safeNum(pk.count)]);
  }

  s3.getColumn(2).numFmt = '#,##0" L"';
  styleSheet(s3);
  autosize(s3);

  if (opts.packagePiePng) await addPng(s3, wb, opts.packagePiePng, 0);

  // --- Optional Raw sheet
  if (opts.rawRows?.length) {
    const raw = wb.addWorksheet("Raw Payments");
    const cols = [
      "id",
      "receipt_no",
      "receipt_date",
      "customer_id",
      "customer_name",
      "customer_phone",
      "point_name",
      "package_code",
      "months_selected",
      "expected_amount",
      "amount_paid",
      "reason",
      "note",
      "created_at",
    ];

    raw.addRow(cols);

    for (const r of opts.rawRows) {
      raw.addRow(cols.map((k) => (r?.[k] ?? "")));
    }

    // format money
    const idxExpected = cols.indexOf("expected_amount") + 1;
    const idxPaid = cols.indexOf("amount_paid") + 1;
    if (idxExpected > 0) raw.getColumn(idxExpected).numFmt = '#,##0" L"';
    if (idxPaid > 0) raw.getColumn(idxPaid).numFmt = '#,##0" L"';

    styleSheet(raw);
    autosize(raw, 55);
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), opts.fileName);
}