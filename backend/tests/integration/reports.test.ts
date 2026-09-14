import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestCompany, cleanupTestCompany } from "./testFixtures";
import { createAndPostSalesInvoice } from "../../src/modules/salesInvoice/salesInvoice.service";
import { createAndAllocateReceipt } from "../../src/modules/receipt/receipt.service";
import { getTrialBalance, getProfitAndLoss, getBalanceSheet, getAccountLedger } from "../../src/modules/reports/reports.service";

describe("integration: reports reflect the SAR 10,000 + 15% VAT scenario", () => {
  let companyId: string;
  let customerId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const fixture = await createTestCompany("Reports Test Co.");
    companyId = fixture.company.id;
    customerId = fixture.customer.id;

    const invoice = await createAndPostSalesInvoice(companyId, {
      customerId,
      invoiceNumber: "INV-REPORTS-0001",
      invoiceDate: new Date().toISOString(),
      arAccountCode: "1100",
      vatPayableAccountCode: "2100",
      lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 10000, vatRate: 15 }],
    });
    invoiceId = invoice.id;

    await createAndAllocateReceipt(companyId, {
      customerId,
      receiptDate: new Date().toISOString(),
      amount: 5000,
      bankAccountCode: "1000",
      arAccountCode: "1100",
      allocations: [{ invoiceId: invoice.id, allocatedAmount: 5000 }],
    });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
    await prisma.$disconnect();
  });

  it("Trial Balance is balanced and shows correct account totals", async () => {
    const tb = await getTrialBalance(companyId);
    expect(tb.isBalanced).toBe(true);

    const ar = tb.rows.find((r) => r.code === "1100")!;
    expect(ar.totalDebit.toFixed(2)).toBe("11500.00");
    expect(ar.totalCredit.toFixed(2)).toBe("5000.00");

    const bank = tb.rows.find((r) => r.code === "1000")!;
    expect(bank.totalDebit.toFixed(2)).toBe("5000.00");

    const revenue = tb.rows.find((r) => r.code === "4000")!;
    expect(revenue.totalCredit.toFixed(2)).toBe("10000.00");

    const vat = tb.rows.find((r) => r.code === "2100")!;
    expect(vat.totalCredit.toFixed(2)).toBe("1500.00");
  });

  it("Profit & Loss shows revenue 10,000 and net income 10,000 (VAT excluded)", async () => {
    const pnl = await getProfitAndLoss(companyId);
    expect(pnl.totalRevenue.toFixed(2)).toBe("10000.00");
    expect(pnl.totalExpense.toFixed(2)).toBe("0.00");
    expect(pnl.netIncome.toFixed(2)).toBe("10000.00");
  });

  it("Balance Sheet balances: Assets 11,500 = Liabilities 1,500 + Equity(net income) 10,000", async () => {
    const bs = await getBalanceSheet(companyId);
    expect(bs.totalAssets.toFixed(2)).toBe("11500.00");
    expect(bs.totalLiabilities.toFixed(2)).toBe("1500.00");
    expect(bs.currentPeriodNetIncome.toFixed(2)).toBe("10000.00");
    expect(bs.isBalanced).toBe(true);
  });

  it("Account ledger for AR shows both journal lines with correct running balance", async () => {
    const arAccount = await prisma.account.findFirstOrThrow({ where: { companyId, code: "1100" } });
    const ledger = await getAccountLedger(companyId, arAccount.id);

    expect(ledger).not.toBeNull();
    expect(ledger!.entries).toHaveLength(2);
    expect(ledger!.entries[0].debit.toFixed(2)).toBe("11500.00");
    expect(ledger!.entries[0].runningBalance.toFixed(2)).toBe("11500.00");
    expect(ledger!.entries[1].credit.toFixed(2)).toBe("5000.00");
    expect(ledger!.entries[1].runningBalance.toFixed(2)).toBe("6500.00");
  });

  it("multi-company isolation: a second company's reports show zero, unaffected by the first", async () => {
    const other = await createTestCompany("Isolation Check Co.");
    const tb = await getTrialBalance(other.company.id);
    expect(tb.totalDebit.toFixed(2)).toBe("0.00");
    expect(tb.totalCredit.toFixed(2)).toBe("0.00");
    await cleanupTestCompany(other.company.id);
  });
});
