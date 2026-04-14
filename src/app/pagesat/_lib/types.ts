export type User = {
  id: number;
  username: string;
  role: "admin" | "point";
  point_name: string;
};

export type PaymentStatus = "manual" | "never_paid" | "free";

export type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;

  current_package: "standarte" | "smart" | "turbo" | "ultra" | null;

  connection_date: string | null;
  payment_status: PaymentStatus | null;
  last_payment_date: string | null;
  paid_until: string | null;

  address?: string | null;
  location?: string | null;
};