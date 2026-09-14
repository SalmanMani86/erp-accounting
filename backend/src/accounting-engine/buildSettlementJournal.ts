import { Decimal } from "@prisma/client/runtime/library";
import { JournalLineDraft } from "./types";
import { validateBalancedLines } from "./validateBalance";

/**
 * Builds the balanced journal lines for a Receipt (customer payment against AR):
 *   Dr Cash/Bank
 *     Cr Accounts Receivable
 */
export function buildReceiptJournalLines(params: {
  bankAccountId: string;
  arAccountId: string;
  amount: Decimal;
}): JournalLineDraft[] {
  const { bankAccountId, arAccountId, amount } = params;

  const lines: JournalLineDraft[] = [
    { accountId: bankAccountId, debit: amount, credit: new Decimal(0) },
    { accountId: arAccountId, debit: new Decimal(0), credit: amount },
  ];

  validateBalancedLines(lines);
  return lines;
}

/**
 * Builds the balanced journal lines for a Payment (payment to supplier against AP):
 *   Dr Accounts Payable
 *     Cr Cash/Bank
 */
export function buildPaymentJournalLines(params: {
  bankAccountId: string;
  apAccountId: string;
  amount: Decimal;
}): JournalLineDraft[] {
  const { bankAccountId, apAccountId, amount } = params;

  const lines: JournalLineDraft[] = [
    { accountId: apAccountId, debit: amount, credit: new Decimal(0) },
    { accountId: bankAccountId, debit: new Decimal(0), credit: amount },
  ];

  validateBalancedLines(lines);
  return lines;
}
