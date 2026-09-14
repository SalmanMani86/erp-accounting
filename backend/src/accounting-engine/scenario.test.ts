import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { buildSalesInvoiceJournalLines } from "./buildInvoiceJournal";
import { buildReceiptJournalLines } from "./buildSettlementJournal";
import { buildReversalLines } from "./buildReversalJournal";
import {
  computeTrialBalance,
  computeProfitAndLoss,
  computeBalanceSheet,
  outstandingInvoiceBalance,
  AccountAggregate,
} from "./reports";

/**
 * Assessment scenario: a customer receives a transport service for SAR 10,000
 * plus 15% VAT and pays SAR 5,000 immediately.
 */
describe("assessment scenario: transport service SAR 10,000 + 15% VAT, SAR 5,000 received", () => {
  const AR = "acct-ar";
  const REVENUE = "acct-transport-revenue";
  const VAT_PAYABLE = "acct-vat-payable";
  const BANK = "acct-bank";

  const subtotal = new Decimal(10000);
  const vatRate = new Decimal(15);
  const vatAmount = subtotal.times(vatRate).dividedBy(100); // 1,500
  const total = subtotal.plus(vatAmount); // 11,500

  it("computes subtotal, VAT and total correctly", () => {
    expect(vatAmount.toFixed(2)).toBe("1500.00");
    expect(total.toFixed(2)).toBe("11500.00");
  });

  const invoiceLines = buildSalesInvoiceJournalLines({
    arAccountId: AR,
    vatPayableAccountId: VAT_PAYABLE,
    lines: [{ targetAccountId: REVENUE, amount: subtotal, vatAmount }],
  });

  it("builds a balanced invoice journal entry: Dr AR 11,500 / Cr Revenue 10,000 / Cr VAT Payable 1,500", () => {
    expect(invoiceLines).toHaveLength(3);

    const ar = invoiceLines.find((l) => l.accountId === AR)!;
    const revenue = invoiceLines.find((l) => l.accountId === REVENUE)!;
    const vat = invoiceLines.find((l) => l.accountId === VAT_PAYABLE)!;

    expect(ar.debit.toFixed(2)).toBe("11500.00");
    expect(ar.credit.toFixed(2)).toBe("0.00");

    expect(revenue.credit.toFixed(2)).toBe("10000.00");
    expect(revenue.debit.toFixed(2)).toBe("0.00");

    expect(vat.credit.toFixed(2)).toBe("1500.00");
    expect(vat.debit.toFixed(2)).toBe("0.00");

    const totalDebit = invoiceLines.reduce((s, l) => s.plus(l.debit), new Decimal(0));
    const totalCredit = invoiceLines.reduce((s, l) => s.plus(l.credit), new Decimal(0));
    expect(totalDebit.equals(totalCredit)).toBe(true);
  });

  const receiptAmount = new Decimal(5000);
  const receiptLines = buildReceiptJournalLines({
    bankAccountId: BANK,
    arAccountId: AR,
    amount: receiptAmount,
  });

  it("builds a balanced receipt journal entry: Dr Cash/Bank 5,000 / Cr AR 5,000", () => {
    expect(receiptLines).toHaveLength(2);

    const bank = receiptLines.find((l) => l.accountId === BANK)!;
    const ar = receiptLines.find((l) => l.accountId === AR)!;

    expect(bank.debit.toFixed(2)).toBe("5000.00");
    expect(ar.credit.toFixed(2)).toBe("5000.00");
  });

  it("computes the remaining customer balance as 6,500", () => {
    const remaining = outstandingInvoiceBalance(total, [receiptAmount]);
    expect(remaining.toFixed(2)).toBe("6500.00");
  });

  // Aggregate both journal entries into a mini GL to prove downstream reports.
  const aggregates: AccountAggregate[] = [
    {
      account: { id: AR, code: "1100", name: "Accounts Receivable", type: "ASSET" },
      totalDebit: invoiceLines.find((l) => l.accountId === AR)!.debit,
      totalCredit: receiptLines.find((l) => l.accountId === AR)!.credit,
    },
    {
      account: { id: BANK, code: "1000", name: "Cash/Bank", type: "ASSET" },
      totalDebit: receiptLines.find((l) => l.accountId === BANK)!.debit,
      totalCredit: new Decimal(0),
    },
    {
      account: { id: REVENUE, code: "4000", name: "Transport Revenue", type: "REVENUE" },
      totalDebit: new Decimal(0),
      totalCredit: invoiceLines.find((l) => l.accountId === REVENUE)!.credit,
    },
    {
      account: { id: VAT_PAYABLE, code: "2100", name: "VAT Payable", type: "LIABILITY" },
      totalDebit: new Decimal(0),
      totalCredit: invoiceLines.find((l) => l.accountId === VAT_PAYABLE)!.credit,
    },
  ];

  it("reflects correct General Ledger balances: AR net 6,500, Bank 5,000, Revenue 10,000, VAT Payable 1,500", () => {
    const tb = computeTrialBalance(aggregates);
    expect(tb.isBalanced).toBe(true);

    const arRow = tb.rows.find((r) => r.accountId === AR)!;
    const netAr = arRow.totalDebit.minus(arRow.totalCredit);
    expect(netAr.toFixed(2)).toBe("6500.00");

    const bankRow = tb.rows.find((r) => r.accountId === BANK)!;
    expect(bankRow.totalDebit.toFixed(2)).toBe("5000.00");
  });

  it("reflects correct Profit & Loss impact: revenue 10,000, VAT excluded, net income 10,000", () => {
    const pnl = computeProfitAndLoss(aggregates);
    expect(pnl.totalRevenue.toFixed(2)).toBe("10000.00");
    expect(pnl.totalExpense.toFixed(2)).toBe("0.00");
    expect(pnl.netIncome.toFixed(2)).toBe("10000.00");
  });

  it("produces a balanced Balance Sheet: Assets (AR 6,500 + Bank 5,000 = 11,500) = Liabilities (VAT 1,500) + Equity (Net income 10,000)", () => {
    const bs = computeBalanceSheet(aggregates);
    expect(bs.totalAssets.toFixed(2)).toBe("11500.00");
    expect(bs.totalLiabilities.toFixed(2)).toBe("1500.00");
    expect(bs.currentPeriodNetIncome.toFixed(2)).toBe("10000.00");
    expect(bs.isBalanced).toBe(true);
  });

  it("cancelling the invoice produces a balanced reversal with zero net GL impact", () => {
    const reversal = buildReversalLines(invoiceLines);
    const totalDebit = reversal.reduce((s, l) => s.plus(l.debit), new Decimal(0));
    const totalCredit = reversal.reduce((s, l) => s.plus(l.credit), new Decimal(0));
    expect(totalDebit.equals(totalCredit)).toBe(true);

    // Net of original + reversal per account is zero.
    for (const original of invoiceLines) {
      const mirror = reversal.find((r) => r.accountId === original.accountId)!;
      const netDebit = original.debit.plus(mirror.debit);
      const netCredit = original.credit.plus(mirror.credit);
      expect(netDebit.equals(netCredit)).toBe(true);
    }
  });
});
