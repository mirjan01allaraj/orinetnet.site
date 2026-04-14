import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type PaymentStatus = "manual" | "never_paid" | "free";

type CategoryKey =
  | "expired"
  | "near_expiry"
  | "free"
  | "never_paid"
  | "normal_active";

type Row = {
  id: number;
  list_nr: number | null;
  connection_date: string | null;
  address: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  current_package: string;
  payment_status?: PaymentStatus;
  last_payment_date: string | null;
  paid_until: string | null;
  created_at?: string | null;
  debt_days?: number;
  days_left?: number | null;
  expiring_soon?: boolean;
  is_debt?: boolean;
  is_free?: boolean;
  category_key?: CategoryKey;
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  expired: "Klientët me abonim të mbaruar",
  near_expiry: "Klientët afër mbarimit të abonimit",
  free: "Klientët Free",
  never_paid: "Klientët që s’kanë paguar asnjëherë",
  normal_active: "Klientët normalë aktivë",
};

const CATEGORY_FILL: Record<CategoryKey, string> = {
  expired: "FDE6D8",
  near_expiry: "FEF3C7",
  free: "E0F2FE",
  never_paid: "FFE4E6",
  normal_active: "DCFCE7",
};

const CATEGORY_TEXT: Record<CategoryKey, string> = {
  expired: "9A3412",
  near_expiry: "92400E",
  free: "075985",
  never_paid: "9F1239",
  normal_active: "166534",
};

const THIN_BORDER = {
  top: { style: "thin" as const, color: { argb: "FF808080" } },
  left: { style: "thin" as const, color: { argb: "FF808080" } },
  bottom: { style: "thin" as const, color: { argb: "FF808080" } },
  right: { style: "thin" as const, color: { argb: "FF808080" } },
};

function formatDateDMY(v?: string | null) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatDateOnly(v?: string | null) {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getSafeCategory(row: Row): CategoryKey {
  return row.category_key || "normal_active";
}

function getBorxhLabel(row: Row) {
  if (row.is_debt && Number(row.debt_days || 0) > 0) {
    return `${row.debt_days} ditë vonesë`;
  }

  if (row.is_free && Number(row.debt_days || 0) > 0) {
    return `${row.debt_days} ditë free`;
  }

  if (row.expiring_soon && typeof row.days_left === "number") {
    return `${row.days_left} ditë të mbetura`;
  }

  return "Aktiv";
}

function makeFileName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `Klientet_${yyyy}-${mm}-${dd}_${hh}-${mi}.xlsx`;
}

function isLikelyUrl(v?: string | null) {
  if (!v) return false;
  return /^https?:\/\//i.test(v);
}

function applyAllBorders(cell: ExcelJS.Cell) {
  cell.border = THIN_BORDER;
}

export async function exportClientsExcel(rows: Row[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OpenAI";
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet("Klientët", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const orderedRows = [...rows].sort((a, b) => {
    const order: CategoryKey[] = [
      "expired",
      "near_expiry",
      "free",
      "never_paid",
      "normal_active",
    ];

    const ca = order.indexOf(getSafeCategory(a));
    const cb = order.indexOf(getSafeCategory(b));
    if (ca !== cb) return ca - cb;

    const na = a.list_nr ?? Number.MAX_SAFE_INTEGER;
    const nb = b.list_nr ?? Number.MAX_SAFE_INTEGER;
    return na - nb;
  });

  const categoryCounts: Record<CategoryKey, number> = {
    expired: 0,
    near_expiry: 0,
    free: 0,
    never_paid: 0,
    normal_active: 0,
  };

  for (const row of orderedRows) {
    categoryCounts[getSafeCategory(row)]++;
  }

  const categorySummary =
    `Të mbaruar: ${categoryCounts.expired} | ` +
    `Afër mbarimit: ${categoryCounts.near_expiry} | ` +
    `Free: ${categoryCounts.free} | ` +
    `Pa pagesë: ${categoryCounts.never_paid} | ` +
    `Aktivë: ${categoryCounts.normal_active}`;

  const totalCols = 13;

  const titleRow = ws.addRow(["LISTA E KLIENTËVE"]);
  titleRow.height = 30;
  ws.mergeCells(`A${titleRow.number}:M${titleRow.number}`);

  const subtitleRow = ws.addRow([
    `Gjithsej klientë: ${orderedRows.length} | ${categorySummary} | Eksportuar më: ${new Date().toLocaleString("sq-AL")}`,
  ]);
  subtitleRow.height = 24;
  ws.mergeCells(`A${subtitleRow.number}:M${subtitleRow.number}`);

  ws.addRow([]);

  const headerRow = ws.addRow([
    "NR",
    "Emri",
    "Mbiemri",
    "Telefoni",
    "Adresa",
    "Created at",
    "Paketa",
    "Data e lidhjes",
    "Pagesa e fundit",
    "Mbarimi i abonimit",
    "Borxh / Status",
    "Kategoria",
    "ID",
  ]);

  ws.columns = [
    { key: "list_nr", width: 9 },
    { key: "first_name", width: 18 },
    { key: "last_name", width: 18 },
    { key: "phone", width: 18 },
    { key: "address", width: 42 },
    { key: "created_at", width: 14 },
    { key: "current_package", width: 14 },
    { key: "connection_date", width: 16 },
    { key: "last_payment_date", width: 18 },
    { key: "paid_until", width: 18 },
    { key: "borxh", width: 22 },
    { key: "category", width: 34 },
    { key: "id", width: 10, hidden: true },
  ];

  titleRow.getCell(1).font = {
    bold: true,
    size: 22,
    color: { argb: "FFFFFFFF" },
  };
  titleRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  applyAllBorders(titleRow.getCell(1));

  subtitleRow.getCell(1).font = {
    size: 14,
    color: { argb: "FFCBD5E1" },
  };
  subtitleRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  subtitleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  applyAllBorders(subtitleRow.getCell(1));

  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111827" },
    };
    applyAllBorders(cell);
  });

  for (const row of orderedRows) {
    const category = getSafeCategory(row);
    const categoryLabel = CATEGORY_LABELS[category];
    const borxhLabel = getBorxhLabel(row);

    const excelRow = ws.addRow([
      row.list_nr ?? "",
      row.first_name || "",
      row.last_name || "",
      row.phone || "",
      row.address || "",
      formatDateOnly(row.created_at),
      (row.current_package || "").toUpperCase(),
      formatDateDMY(row.connection_date),
      formatDateDMY(row.last_payment_date),
      formatDateDMY(row.paid_until),
      borxhLabel,
      categoryLabel,
      row.id,
    ]);

    excelRow.height = 22;

    excelRow.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: "middle",
        horizontal:
          colNumber === 1 ||
          colNumber === 6 ||
          colNumber === 8 ||
          colNumber === 9 ||
          colNumber === 10 ||
          colNumber === 11 ||
          colNumber === 12 ||
          colNumber === 13
            ? "center"
            : "left",
        wrapText: true,
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" },
      };

      cell.font = {
        color: { argb: "FF111827" },
        bold: colNumber === 2 || colNumber === 3,
      };

      applyAllBorders(cell);
    });

    if (isLikelyUrl(row.address)) {
      const addressCell = excelRow.getCell(5);
      addressCell.value = {
        text: row.address as string,
        hyperlink: row.address as string,
      };
      addressCell.font = {
        color: { argb: "FF2563EB" },
        underline: true,
      };
      applyAllBorders(addressCell);
    }

    const borxhCell = excelRow.getCell(11);
    borxhCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${CATEGORY_FILL[category]}` },
    };
    borxhCell.font = {
      color: { argb: `FF${CATEGORY_TEXT[category]}` },
      bold: true,
    };
    borxhCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    applyAllBorders(borxhCell);

    const categoryCell = excelRow.getCell(12);
    categoryCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${CATEGORY_FILL[category]}` },
    };
    categoryCell.font = {
      color: { argb: `FF${CATEGORY_TEXT[category]}` },
      bold: true,
    };
    categoryCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    applyAllBorders(categoryCell);
  }

  const headerIndex = 4;
  const dataEndRow = ws.rowCount;

  ws.autoFilter = {
    from: { row: headerIndex, column: 1 },
    to: { row: dataEndRow, column: totalCols },
  };

  ws.getColumn(1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(6).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(8).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(9).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(10).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(11).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(12).alignment = { horizontal: "center", vertical: "middle" };
  ws.getColumn(13).hidden = true;

  const legendTitleCell = ws.getCell("N4");
  legendTitleCell.value = "LEGJENDA E KATEGORIVE";
  legendTitleCell.font = {
    bold: true,
    size: 12,
    color: { argb: "FF111827" },
  };
  legendTitleCell.alignment = {
    horizontal: "left",
    vertical: "middle",
  };

  ws.getColumn("N").width = 34;
  ws.getColumn("O").width = 18;

  const legendItems: CategoryKey[] = [
    "expired",
    "near_expiry",
    "free",
    "never_paid",
    "normal_active",
  ];

  legendItems.forEach((key, index) => {
    const rowNr = 5 + index;
    const cellA = ws.getCell(`N${rowNr}`);
    const cellB = ws.getCell(`O${rowNr}`);

    cellA.value = CATEGORY_LABELS[key];
    cellB.value = categoryCounts[key];

    [cellA, cellB].forEach((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${CATEGORY_FILL[key]}` },
      };
      cell.font = {
        color: { argb: `FF${CATEGORY_TEXT[key]}` },
        bold: true,
      };
      cell.border = THIN_BORDER;
      cell.alignment = {
        horizontal: cell.address.startsWith("O") ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
    });
  });

  for (let rowNumber = headerIndex; rowNumber <= dataEndRow; rowNumber++) {
    const row = ws.getRow(rowNumber);
    for (let colNumber = 1; colNumber <= totalCols; colNumber++) {
      const cell = row.getCell(colNumber);
      applyAllBorders(cell);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, makeFileName());
}