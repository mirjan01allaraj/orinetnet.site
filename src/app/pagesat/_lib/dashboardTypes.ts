export type ReceiptRow = {
  id: number | string;
  customer_id?: number | string;
  receipt_no?: string;
  amount_paid?: number | string;
  customer_name?: string;
  customer_phone?: string | null;
  package_code?: string;
  months_selected?: number;
  created_at?: string;
  payment_date?: string;
};

export type ClientGroup = {
  key: string;
  customer_id?: number | string;
  customer_name: string;
  customer_phone: string | null;
  receipt_count: number;
  total_paid: number;
  latest_receipt_date: string | null;
  receipts: ReceiptRow[];
};

export type ViewMode = "receipts" | "clients";