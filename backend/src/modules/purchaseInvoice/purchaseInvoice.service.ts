import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationFailedError, InvalidStateError } from "../../lib/errors";
import { findSupplierOrThrow, findPurchaseInvoiceOrThrow } from "../../lib/scopedLookups";
import { assertOpenPeriodForDate } from "../fiscalPeriod/fiscalPeriod.service";
import { recordAuditLog } from "../auditLog/auditLog.service";
import { buildPurchaseInvoiceJournalLines } from "../../accounting-engine/buildInvoiceJournal";
import { buildReversalLines } from "../../accounting-engine/buildReversalJournal";
import { sum } from "../../accounting-engine/money";
import { isUniqueIdempotencyViolation, throwDuplicateRequestError } from "../../lib/idempotency";

export interface CreatePurchaseInvoiceLineInput {
  description: string;
  expenseAccountCode: string;
  amount: string | number;
  vatRate: string | number;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  apAccountCode: string;
  vatReceivableAccountCode: string;
  lines: CreatePurchaseInvoiceLineInput[];
  idempotencyKey?: string;
}

/**
 * Creates a Purchase Invoice and posts it to the ledger atomically. Mirrors
 * createAndPostSalesInvoice on the AP side:
 *   Dr Expense account(s)   (subtotal per line)
 *   Dr VAT Receivable       (VAT total)
 *     Cr Accounts Payable   (subtotal + VAT)
 */
export async function createAndPostPurchaseInvoice(companyId: string, input: CreatePurchaseInvoiceInput) {
  if (input.lines.length === 0) {
    throw new ValidationFailedError("Invoice must have at least one line");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const invoiceDate = new Date(input.invoiceDate);

      const supplier = await findSupplierOrThrow(tx, companyId, input.supplierId);
      const apAccount = await tx.account.findFirst({
        where: { companyId, code: input.apAccountCode, isActive: true },
      });
      if (!apAccount) throw new NotFoundError(`AP account "${input.apAccountCode}"`);
      const vatAccount = await tx.account.findFirst({
        where: { companyId, code: input.vatReceivableAccountCode, isActive: true },
      });
      if (!vatAccount) throw new NotFoundError(`VAT receivable account "${input.vatReceivableAccountCode}"`);

      const period = await assertOpenPeriodForDate(tx, companyId, invoiceDate);

      const resolvedLines = await Promise.all(
        input.lines.map(async (line) => {
          const account = await tx.account.findFirst({
            where: { companyId, code: line.expenseAccountCode, isActive: true },
          });
          if (!account) throw new NotFoundError(`Expense account "${line.expenseAccountCode}"`);

          const amount = new Decimal(line.amount).toDecimalPlaces(2);
          if (amount.lessThanOrEqualTo(0)) {
            throw new ValidationFailedError("Invoice line amount must be greater than zero");
          }
          const vatRate = new Decimal(line.vatRate).toDecimalPlaces(2);
          const vatAmount = amount.times(vatRate).dividedBy(100).toDecimalPlaces(2);

          return { account, amount, vatRate, vatAmount, description: line.description };
        })
      );

      const subtotal = sum(resolvedLines.map((l) => l.amount));
      const vatAmount = sum(resolvedLines.map((l) => l.vatAmount));
      const totalAmount = subtotal.plus(vatAmount);

      const journalLines = buildPurchaseInvoiceJournalLines({
        apAccountId: apAccount.id,
        vatReceivableAccountId: vatAccount.id,
        lines: resolvedLines.map((l) => ({
          targetAccountId: l.account.id,
          amount: l.amount,
          vatAmount: l.vatAmount,
        })),
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          fiscalPeriodId: period.id,
          entryDate: invoiceDate,
          sourceType: "PURCHASE_INVOICE",
          description: `Purchase invoice ${input.invoiceNumber}`,
          lines: {
            create: journalLines.map((l, idx) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              lineOrder: idx,
            })),
          },
        },
      });

      const invoice = await tx.purchaseInvoice.create({
        data: {
          companyId,
          supplierId: supplier.id,
          fiscalPeriodId: period.id,
          invoiceNumber: input.invoiceNumber,
          invoiceDate,
          subtotal,
          vatAmount,
          totalAmount,
          status: "POSTED",
          journalEntryId: journalEntry.id,
          idempotencyKey: input.idempotencyKey,
          lines: {
            create: resolvedLines.map((l) => ({
              description: l.description,
              expenseAccountId: l.account.id,
              amount: l.amount,
              vatRate: l.vatRate,
              vatAmount: l.vatAmount,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { sourceId: invoice.id },
      });

      await recordAuditLog(tx, {
        companyId,
        action: "PURCHASE_INVOICE_POSTED",
        entityType: "PurchaseInvoice",
        entityId: invoice.id,
        afterState: {
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount.toString(),
          journalEntryId: journalEntry.id,
        },
      });

      return invoice;
    });
  } catch (error) {
    if (isUniqueIdempotencyViolation(error)) throwDuplicateRequestError();
    throw error;
  }
}

export async function getPurchaseInvoice(companyId: string, invoiceId: string) {
  return findPurchaseInvoiceOrThrow(prisma, companyId, invoiceId);
}

export async function listPurchaseInvoices(companyId: string) {
  return prisma.purchaseInvoice.findMany({
    where: { companyId },
    include: { supplier: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getPurchaseInvoiceOutstandingBalance(companyId: string, invoiceId: string): Promise<Decimal> {
  const invoice = await findPurchaseInvoiceOrThrow(prisma, companyId, invoiceId);
  const allocations = await prisma.paymentAllocation.findMany({
    where: { invoiceId: invoice.id, payment: { status: "POSTED" } },
  });
  const allocated = sum(allocations.map((a) => a.allocatedAmount));
  return invoice.totalAmount.minus(allocated);
}

/**
 * Cancels a posted purchase invoice via accounting reversal, mirroring
 * cancelSalesInvoice: never deletes, creates a mirrored reversal journal
 * entry instead.
 */
export async function cancelPurchaseInvoice(companyId: string, invoiceId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundError("Purchase invoice");
    if (invoice.status === "CANCELLED") {
      throw new InvalidStateError("Invoice is already cancelled");
    }
    if (invoice.status === "DRAFT") {
      throw new InvalidStateError("Draft invoices have no posting to reverse; delete instead");
    }
    if (!invoice.journalEntryId) {
      throw new InvalidStateError("Posted invoice is missing its journal entry reference");
    }

    const originalJournal = await tx.journalEntry.findUniqueOrThrow({
      where: { id: invoice.journalEntryId },
      include: { lines: true },
    });

    const period = await assertOpenPeriodForDate(tx, companyId, new Date());

    const reversalLines = buildReversalLines(
      originalJournal.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit }))
    );

    const reversalJournal = await tx.journalEntry.create({
      data: {
        companyId,
        fiscalPeriodId: period.id,
        entryDate: new Date(),
        sourceType: "REVERSAL",
        sourceId: invoice.id,
        reversalOfId: originalJournal.id,
        description: `Reversal of purchase invoice ${invoice.invoiceNumber}`,
        lines: {
          create: reversalLines.map((l, idx) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            lineOrder: idx,
          })),
        },
      },
    });

    const updated = await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: { status: "CANCELLED" },
    });

    await recordAuditLog(tx, {
      companyId,
      action: "PURCHASE_INVOICE_CANCELLED",
      entityType: "PurchaseInvoice",
      entityId: invoice.id,
      beforeState: { status: invoice.status },
      afterState: { status: updated.status, reversalJournalEntryId: reversalJournal.id },
    });

    return updated;
  });
}
