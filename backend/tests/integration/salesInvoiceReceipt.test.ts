import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../src/lib/prisma";
import { createTestCompany, cleanupTestCompany } from "./testFixtures";
import { createAndPostSalesInvoice, getSalesInvoiceOutstandingBalance, cancelSalesInvoice } from "../../src/modules/salesInvoice/salesInvoice.service";
import { createAndAllocateReceipt } from "../../src/modules/receipt/receipt.service";
import { closeFiscalPeriod } from "../../src/modules/fiscalPeriod/fiscalPeriod.service";
import { PeriodClosedError } from "../../src/lib/errors";

describe("integration: SAR 10,000 + 15% VAT transport invoice, SAR 5,000 receipt", () => {
  let companyId: string;

  beforeAll(async () => {
    const fixture = await createTestCompany("Integration Test Co.");
    companyId = fixture.company.id;
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
    await prisma.$disconnect();
  });

  it("posts the invoice with correct GL impact and remaining balance after partial receipt", async () => {
    const fixture = await prisma.customer.findFirstOrThrow({ where: { companyId } });

    const invoice = await createAndPostSalesInvoice(companyId, {
      customerId: fixture.id,
      invoiceNumber: "INV-0001",
      invoiceDate: new Date().toISOString(),
      arAccountCode: "1100",
      vatPayableAccountCode: "2100",
      lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 10000, vatRate: 15 }],
    });

    expect(invoice.subtotal.toFixed(2)).toBe("10000.00");
    expect(invoice.vatAmount.toFixed(2)).toBe("1500.00");
    expect(invoice.totalAmount.toFixed(2)).toBe("11500.00");
    expect(invoice.status).toBe("POSTED");
    expect(invoice.journalEntryId).not.toBeNull();

    // Journal entry balances (debit == credit) in the real DB.
    const journalLines = await prisma.journalEntryLine.findMany({
      where: { journalEntryId: invoice.journalEntryId! },
    });
    const totalDebit = journalLines.reduce((s, l) => s.plus(l.debit), new Decimal(0));
    const totalCredit = journalLines.reduce((s, l) => s.plus(l.credit), new Decimal(0));
    expect(totalDebit.toFixed(2)).toBe(totalCredit.toFixed(2));
    expect(totalDebit.toFixed(2)).toBe("11500.00");

    // Receipt of SAR 5,000
    const receipt = await createAndAllocateReceipt(companyId, {
      customerId: fixture.id,
      receiptDate: new Date().toISOString(),
      amount: 5000,
      bankAccountCode: "1000",
      arAccountCode: "1100",
      allocations: [{ invoiceId: invoice.id, allocatedAmount: 5000 }],
    });

    expect(receipt.amount.toFixed(2)).toBe("5000.00");
    expect(receipt.status).toBe("POSTED");

    const remaining = await getSalesInvoiceOutstandingBalance(companyId, invoice.id);
    expect(remaining.toFixed(2)).toBe("6500.00");

    // GL: AR account net balance should equal remaining balance (6,500)
    const arAccount = await prisma.account.findFirstOrThrow({ where: { companyId, code: "1100" } });
    const arLines = await prisma.journalEntryLine.findMany({
      where: { accountId: arAccount.id, journalEntry: { companyId } },
    });
    const arDebit = arLines.reduce((s, l) => s + Number(l.debit), 0);
    const arCredit = arLines.reduce((s, l) => s + Number(l.credit), 0);
    expect((arDebit - arCredit).toFixed(2)).toBe("6500.00");
  });

  it("rejects over-allocation beyond the invoice's outstanding balance", async () => {
    const fixture = await prisma.customer.findFirstOrThrow({ where: { companyId } });

    const invoice = await createAndPostSalesInvoice(companyId, {
      customerId: fixture.id,
      invoiceNumber: "INV-0002",
      invoiceDate: new Date().toISOString(),
      arAccountCode: "1100",
      vatPayableAccountCode: "2100",
      lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 1000, vatRate: 15 }],
    });

    await expect(
      createAndAllocateReceipt(companyId, {
        customerId: fixture.id,
        receiptDate: new Date().toISOString(),
        amount: 2000,
        bankAccountCode: "1000",
        arAccountCode: "1100",
        allocations: [{ invoiceId: invoice.id, allocatedAmount: 2000 }],
      })
    ).rejects.toThrow(/exceeds outstanding balance/);
  });

  it("rejects an idempotent duplicate invoice creation with the same key", async () => {
    const fixture = await prisma.customer.findFirstOrThrow({ where: { companyId } });
    const key = "idem-key-test-1";

    await createAndPostSalesInvoice(companyId, {
      customerId: fixture.id,
      invoiceNumber: "INV-0003",
      invoiceDate: new Date().toISOString(),
      arAccountCode: "1100",
      vatPayableAccountCode: "2100",
      lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 500, vatRate: 15 }],
      idempotencyKey: key,
    });

    await expect(
      createAndPostSalesInvoice(companyId, {
        customerId: fixture.id,
        invoiceNumber: "INV-0004",
        invoiceDate: new Date().toISOString(),
        arAccountCode: "1100",
        vatPayableAccountCode: "2100",
        lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 500, vatRate: 15 }],
        idempotencyKey: key,
      })
    ).rejects.toThrow(/already been processed/);
  });

  it("cancelling a posted invoice creates a reversal journal entry with zero net GL impact", async () => {
    const fixture = await prisma.customer.findFirstOrThrow({ where: { companyId } });

    const invoice = await createAndPostSalesInvoice(companyId, {
      customerId: fixture.id,
      invoiceNumber: "INV-0005",
      invoiceDate: new Date().toISOString(),
      arAccountCode: "1100",
      vatPayableAccountCode: "2100",
      lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 2000, vatRate: 15 }],
    });

    const cancelled = await cancelSalesInvoice(companyId, invoice.id);
    expect(cancelled.status).toBe("CANCELLED");

    const reversalEntry = await prisma.journalEntry.findFirst({
      where: { companyId, sourceType: "REVERSAL", sourceId: invoice.id },
      include: { lines: true },
    });
    expect(reversalEntry).not.toBeNull();

    const arAccount = await prisma.account.findFirstOrThrow({ where: { companyId, code: "1100" } });
    const arLines = await prisma.journalEntryLine.findMany({
      where: {
        accountId: arAccount.id,
        journalEntry: { companyId, sourceId: invoice.id },
      },
    });
    const arDebit = arLines.reduce((s, l) => s + Number(l.debit), 0);
    const arCredit = arLines.reduce((s, l) => s + Number(l.credit), 0);
    expect((arDebit - arCredit).toFixed(2)).toBe("0.00");
  });

  it("rejects posting once the fiscal period is closed", async () => {
    const closedFixture = await createTestCompany("Closed Period Co.");
    const fixture = closedFixture.customer;

    await closeFiscalPeriod(closedFixture.company.id, closedFixture.fiscalPeriod.id);

    await expect(
      createAndPostSalesInvoice(closedFixture.company.id, {
        customerId: fixture.id,
        invoiceNumber: "INV-CLOSED-0001",
        invoiceDate: new Date().toISOString(),
        arAccountCode: "1100",
        vatPayableAccountCode: "2100",
        lines: [{ description: "Transport service", revenueAccountCode: "4000", amount: 100, vatRate: 15 }],
      })
    ).rejects.toThrow(PeriodClosedError);

    await cleanupTestCompany(closedFixture.company.id);
  });
});
