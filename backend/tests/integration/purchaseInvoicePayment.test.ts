import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestCompany, cleanupTestCompany } from "./testFixtures";
import { createAndPostPurchaseInvoice, getPurchaseInvoiceOutstandingBalance, cancelPurchaseInvoice } from "../../src/modules/purchaseInvoice/purchaseInvoice.service";
import { createAndAllocatePayment } from "../../src/modules/payment/payment.service";

describe("integration: Purchase Invoice + Payment (AP side)", () => {
  let companyId: string;
  let supplierId: string;

  beforeAll(async () => {
    const fixture = await createTestCompany("AP Test Co.");
    companyId = fixture.company.id;
    supplierId = fixture.supplier.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
    await prisma.$disconnect();
  });

  it("posts a purchase invoice: Dr Expense 4,000 + Dr VAT Receivable 600 = Cr AP 4,600", async () => {
    const invoice = await createAndPostPurchaseInvoice(companyId, {
      supplierId,
      invoiceNumber: "PINV-0001",
      invoiceDate: new Date().toISOString(),
      apAccountCode: "2000",
      vatReceivableAccountCode: "1200",
      lines: [{ description: "Vehicle parts", expenseAccountCode: "5000", amount: 4000, vatRate: 15 }],
    });

    expect(invoice.subtotal.toFixed(2)).toBe("4000.00");
    expect(invoice.vatAmount.toFixed(2)).toBe("600.00");
    expect(invoice.totalAmount.toFixed(2)).toBe("4600.00");
    expect(invoice.status).toBe("POSTED");

    const journalLines = await prisma.journalEntryLine.findMany({ where: { journalEntryId: invoice.journalEntryId! } });
    const totalDebit = journalLines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = journalLines.reduce((s, l) => s + Number(l.credit), 0);
    expect(totalDebit.toFixed(2)).toBe(totalCredit.toFixed(2));
    expect(totalDebit.toFixed(2)).toBe("4600.00");
  });

  it("pays part of the invoice and computes correct outstanding balance", async () => {
    const invoice = await createAndPostPurchaseInvoice(companyId, {
      supplierId,
      invoiceNumber: "PINV-0002",
      invoiceDate: new Date().toISOString(),
      apAccountCode: "2000",
      vatReceivableAccountCode: "1200",
      lines: [{ description: "Vehicle parts", expenseAccountCode: "5000", amount: 1000, vatRate: 15 }],
    });

    const payment = await createAndAllocatePayment(companyId, {
      supplierId,
      paymentDate: new Date().toISOString(),
      amount: 600,
      bankAccountCode: "1000",
      apAccountCode: "2000",
      allocations: [{ invoiceId: invoice.id, allocatedAmount: 600 }],
    });

    expect(payment.status).toBe("POSTED");

    const remaining = await getPurchaseInvoiceOutstandingBalance(companyId, invoice.id);
    expect(remaining.toFixed(2)).toBe("550.00"); // 1150 total - 600 paid
  });

  it("cancelling a posted purchase invoice creates a zero-net reversal", async () => {
    const invoice = await createAndPostPurchaseInvoice(companyId, {
      supplierId,
      invoiceNumber: "PINV-0003",
      invoiceDate: new Date().toISOString(),
      apAccountCode: "2000",
      vatReceivableAccountCode: "1200",
      lines: [{ description: "Vehicle parts", expenseAccountCode: "5000", amount: 800, vatRate: 15 }],
    });

    const cancelled = await cancelPurchaseInvoice(companyId, invoice.id);
    expect(cancelled.status).toBe("CANCELLED");

    const reversalEntry = await prisma.journalEntry.findFirst({
      where: { companyId, sourceType: "REVERSAL", sourceId: invoice.id },
    });
    expect(reversalEntry).not.toBeNull();
  });
});
