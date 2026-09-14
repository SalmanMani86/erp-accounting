import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError } from "./errors";

type TxClient = Prisma.TransactionClient;

/**
 * Every one of these helpers takes companyId as a required argument and
 * bakes it into the WHERE clause. Services must never call
 * `prisma.<model>.findUnique({ where: { id } })` directly on a tenant-owned
 * table — going through these instead makes it structurally impossible for
 * a request scoped to Company A to read a row belonging to Company B: a
 * mismatched id/companyId pair simply looks like "not found".
 */

export async function findCustomerOrThrow(client: TxClient | typeof prisma, companyId: string, customerId: string) {
  const customer = await client.customer.findFirst({ where: { id: customerId, companyId } });
  if (!customer) throw new NotFoundError("Customer");
  return customer;
}

export async function findSupplierOrThrow(client: TxClient | typeof prisma, companyId: string, supplierId: string) {
  const supplier = await client.supplier.findFirst({ where: { id: supplierId, companyId } });
  if (!supplier) throw new NotFoundError("Supplier");
  return supplier;
}

export async function findAccountOrThrow(client: TxClient | typeof prisma, companyId: string, accountId: string) {
  const account = await client.account.findFirst({ where: { id: accountId, companyId, isActive: true } });
  if (!account) throw new NotFoundError("Account");
  return account;
}

export async function findSalesInvoiceOrThrow(client: TxClient | typeof prisma, companyId: string, invoiceId: string) {
  const invoice = await client.salesInvoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lines: true },
  });
  if (!invoice) throw new NotFoundError("Sales invoice");
  return invoice;
}

export async function findPurchaseInvoiceOrThrow(
  client: TxClient | typeof prisma,
  companyId: string,
  invoiceId: string
) {
  const invoice = await client.purchaseInvoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lines: true },
  });
  if (!invoice) throw new NotFoundError("Purchase invoice");
  return invoice;
}

export async function findCompanyOrThrow(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError("Company");
  return company;
}
