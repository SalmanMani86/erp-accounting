import { Decimal } from "@prisma/client/runtime/library";
import { JournalLineDraft } from "./types";
import { validateBalancedLines } from "./validateBalance";
import { sum } from "./money";

export interface InvoiceLineInput {
  /** Revenue account (sales) or expense account (purchase) for this line */
  targetAccountId: string;
  amount: Decimal;
  vatAmount: Decimal;
}

/**
 * Builds the balanced journal lines for a Sales Invoice:
 *   Dr Accounts Receivable   (subtotal + VAT)
 *     Cr Revenue account(s)  (subtotal per line)
 *     Cr VAT Payable         (VAT total)
 */
export function buildSalesInvoiceJournalLines(params: {
  arAccountId: string;
  vatPayableAccountId: string;
  lines: InvoiceLineInput[];
}): JournalLineDraft[] {
  const { arAccountId, vatPayableAccountId, lines } = params;

  const totalAmount = sum(lines.map((l) => l.amount));
  const totalVat = sum(lines.map((l) => l.vatAmount));
  const totalReceivable = totalAmount.plus(totalVat);

  const journalLines: JournalLineDraft[] = [
    { accountId: arAccountId, debit: totalReceivable, credit: new Decimal(0) },
    ...lines.map((l) => ({
      accountId: l.targetAccountId,
      debit: new Decimal(0),
      credit: l.amount,
    })),
  ];

  if (totalVat.greaterThan(0)) {
    journalLines.push({
      accountId: vatPayableAccountId,
      debit: new Decimal(0),
      credit: totalVat,
    });
  }

  validateBalancedLines(journalLines);
  return journalLines;
}

/**
 * Builds the balanced journal lines for a Purchase Invoice:
 *   Dr Expense account(s)    (subtotal per line)
 *   Dr VAT Receivable        (VAT total)
 *     Cr Accounts Payable    (subtotal + VAT)
 */
export function buildPurchaseInvoiceJournalLines(params: {
  apAccountId: string;
  vatReceivableAccountId: string;
  lines: InvoiceLineInput[];
}): JournalLineDraft[] {
  const { apAccountId, vatReceivableAccountId, lines } = params;

  const totalAmount = sum(lines.map((l) => l.amount));
  const totalVat = sum(lines.map((l) => l.vatAmount));
  const totalPayable = totalAmount.plus(totalVat);

  const journalLines: JournalLineDraft[] = [
    ...lines.map((l) => ({
      accountId: l.targetAccountId,
      debit: l.amount,
      credit: new Decimal(0),
    })),
  ];

  if (totalVat.greaterThan(0)) {
    journalLines.push({
      accountId: vatReceivableAccountId,
      debit: totalVat,
      credit: new Decimal(0),
    });
  }

  journalLines.push({
    accountId: apAccountId,
    debit: new Decimal(0),
    credit: totalPayable,
  });

  validateBalancedLines(journalLines);
  return journalLines;
}
