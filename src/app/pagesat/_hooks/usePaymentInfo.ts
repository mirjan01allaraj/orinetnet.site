import { useMemo } from "react";
import type { Customer } from "../_lib/types";
import {
  addMonthsISO,
  diffDaysISO,
  formatDateDMY,
  formatDebt,
  isoToday,
  parseISO,
} from "../_lib/dashboardUtils";

export type PaymentInfo = {
  paymentStatus: string;
  connectionDateLabel: string;
  lastPayLabel: string;
  paidUntilLabel: string;
  hasDebt: boolean;
  debtText: string;
  baseStartLabel: string;
  nextEndLabel: string;
  monthsDuration: number;
  explanationTitle: string;
  explanationText: string;
};

export function usePaymentInfo(
  selected: Customer | null,
  monthsSelected: number,
  todayDate?: string | null
): PaymentInfo | null {
  return useMemo(() => {
    if (!selected) return null;

    const todayISO = todayDate || isoToday();

    const paymentStatus =
      ((selected as any).payment_status as string | null | undefined) ||
      "manual";

    const connectionDateRaw = (selected as any).connection_date as
      | string
      | null
      | undefined;
    const lastPayRaw = (selected as any).last_payment_date as
      | string
      | null
      | undefined;
    const paidUntilRaw = (selected as any).paid_until as
      | string
      | null
      | undefined;

    const hasConnectionDate = !!(
      connectionDateRaw && parseISO(connectionDateRaw)
    );
    const hasLastPay = !!(lastPayRaw && parseISO(lastPayRaw));
    const hasPaidUntil = !!(paidUntilRaw && parseISO(paidUntilRaw));

    let lastPayLabel = "—";
    if (paymentStatus === "never_paid" || !hasLastPay) {
      lastPayLabel = "Asnjë pagesë";
    } else if (paymentStatus === "free") {
      lastPayLabel = "Free";
    } else {
      lastPayLabel = formatDateDMY(lastPayRaw);
    }

    let debtDays = 0;
    if (hasPaidUntil && paidUntilRaw) {
      const d = diffDaysISO(todayISO, paidUntilRaw);
      debtDays = d > 0 ? d : 0;
    } else if (
      (paymentStatus === "never_paid" || !hasLastPay) &&
      hasConnectionDate &&
      connectionDateRaw
    ) {
      const d = diffDaysISO(todayISO, connectionDateRaw);
      debtDays = d > 0 ? d : 0;
    }

    const hasDebt = debtDays > 0;

    let baseStart = todayISO;
    let calculationMode:
      | "debt_from_old_expiry"
      | "extend_from_current_expiry"
      | "from_connection_date_no_previous_payment" =
      "from_connection_date_no_previous_payment";

    if (hasPaidUntil && paidUntilRaw) {
      baseStart = paidUntilRaw;
      calculationMode = hasDebt
        ? "debt_from_old_expiry"
        : "extend_from_current_expiry";
    } else {
      baseStart =
        hasConnectionDate && connectionDateRaw ? connectionDateRaw : todayISO;
      calculationMode = "from_connection_date_no_previous_payment";
    }

    const nextEnd =
      monthsSelected > 0 ? addMonthsISO(baseStart, monthsSelected) : baseStart;

    let explanationTitle = "";
    let explanationText = "";

    if (calculationMode === "debt_from_old_expiry") {
      explanationTitle = "Llogaritja me vonesë";
      explanationText = `Klienti ka ${formatDebt(
        debtDays
      )} vonesë. Skadimi i ri llogaritet nga skadimi i fundit ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    } else if (calculationMode === "extend_from_current_expiry") {
      explanationTitle = "Llogaritja për klient aktiv";
      explanationText = `Klienti është aktiv. Skadimi i ri llogaritet nga skadimi aktual ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    } else {
      explanationTitle = "Llogaritja pa pagesë të mëparshme";
      explanationText = `Klienti nuk ka pagesë të mëparshme. Skadimi i ri llogaritet nga data e lidhjes ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    }

    return {
      paymentStatus,
      connectionDateLabel: hasConnectionDate
        ? formatDateDMY(connectionDateRaw)
        : "—",
      lastPayLabel,
      paidUntilLabel: hasPaidUntil ? formatDateDMY(paidUntilRaw) : "—",
      hasDebt,
      debtText: hasDebt ? formatDebt(debtDays) : "Nuk ka",
      baseStartLabel: formatDateDMY(baseStart),
      nextEndLabel: formatDateDMY(nextEnd),
      monthsDuration: monthsSelected,
      explanationTitle,
      explanationText,
    };
  }, [selected, monthsSelected, todayDate]);
}