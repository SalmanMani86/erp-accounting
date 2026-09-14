import { prisma } from "../../src/lib/prisma";
import { AccountType } from "@prisma/client";

const STANDARD_ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash/Bank", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "1200", name: "VAT Receivable", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "VAT Payable", type: "LIABILITY" },
  { code: "3000", name: "Retained Earnings", type: "EQUITY" },
  { code: "4000", name: "Transport Revenue", type: "REVENUE" },
  { code: "5000", name: "General Expense", type: "EXPENSE" },
];

export async function createTestCompany(name: string) {
  const company = await prisma.company.create({ data: { name } });

  await prisma.account.createMany({
    data: STANDARD_ACCOUNTS.map((a) => ({ ...a, companyId: company.id })),
  });

  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const fiscalPeriod = await prisma.fiscalPeriod.create({
    data: {
      companyId: company.id,
      name: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
      startDate,
      endDate,
      status: "OPEN",
    },
  });

  const customer = await prisma.customer.create({
    data: { companyId: company.id, name: "Test Customer" },
  });

  const supplier = await prisma.supplier.create({
    data: { companyId: company.id, name: "Test Supplier" },
  });

  return { company, fiscalPeriod, customer, supplier };
}

export async function cleanupTestCompany(companyId: string) {
  // Children first, respecting FK restrict/cascade order.
  await prisma.receiptAllocation.deleteMany({ where: { receipt: { companyId } } });
  await prisma.paymentAllocation.deleteMany({ where: { payment: { companyId } } });
  await prisma.journalEntryLine.deleteMany({ where: { journalEntry: { companyId } } });
  await prisma.salesInvoiceLine.deleteMany({ where: { invoice: { companyId } } });
  await prisma.purchaseInvoiceLine.deleteMany({ where: { invoice: { companyId } } });
  await prisma.receipt.deleteMany({ where: { companyId } });
  await prisma.payment.deleteMany({ where: { companyId } });
  await prisma.salesInvoice.updateMany({ where: { companyId }, data: { journalEntryId: null } });
  await prisma.purchaseInvoice.updateMany({ where: { companyId }, data: { journalEntryId: null } });
  await prisma.salesInvoice.deleteMany({ where: { companyId } });
  await prisma.purchaseInvoice.deleteMany({ where: { companyId } });
  await prisma.journalEntry.updateMany({ where: { companyId }, data: { reversalOfId: null } });
  await prisma.journalEntry.deleteMany({ where: { companyId } });
  await prisma.auditLog.deleteMany({ where: { companyId } });
  await prisma.customer.deleteMany({ where: { companyId } });
  await prisma.supplier.deleteMany({ where: { companyId } });
  await prisma.account.deleteMany({ where: { companyId } });
  await prisma.fiscalPeriod.deleteMany({ where: { companyId } });
  await prisma.company.delete({ where: { id: companyId } });
}
