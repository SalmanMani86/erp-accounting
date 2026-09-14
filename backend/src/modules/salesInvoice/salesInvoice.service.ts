import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationFailedError, InvalidStateError } from "../../lib/errors";
import { findCustomerOrThrow, findSalesInvoiceOrThrow } from "../../lib/scopedLookups";
import { assertOpenPeriodForDate } from "../fiscalPeriod/fiscalPeriod.service";
import { recordAuditLog } from "../auditLog/auditLog.service";
import { buildSalesInvoiceJournalLines } from "../../accounting-engine/buildInvoiceJournal";
import { buildReversalLines } from "../../accounting-engine/buildReversalJournal";
import { sum } from "../../accounting-engine/money";
import { isUniqueIdempotencyViolation, throwDuplicateRequestError } from "../../lib/idempotency";

export interface CreateSalesInvoiceLineInput {
  description: string;
  revenueAccountCode: string;
  amount: string | number;
  vatRate: string | number;
}

export interface CreateSalesInvoiceInput {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  arAccountCode: string;
  vatPayableAccountCode: string;
  lines: CreateSalesInvoiceLineInput[];
  idempotencyKey?: string;
}

/**
 * Creates a Sales Invoice and posts it to the ledger atomically: the
 * operational record (SalesInvoice + lines), the accounting record
 * (JournalEntry + lines), and the link between them are all written in one
 * database transaction. Either everything succeeds, or nothing is written —
 * there is no state where an invoice exists without its journal entry, or
 * vice versa.
 */
export async function createAndPostSalesInvoice(companyId: string, input: CreateSalesInvoiceInput) {
  if (input.lines.length === 0) {
    throw new ValidationFailedError("Invoice must have at least one line");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const invoiceDate = new Date(input.invoiceDate);

      const customer = await findCustomerOrThrow(tx, companyId, input.customerId);
      const arAccount = await tx.account.findFirst({
        where: { companyId, code: input.arAccountCode, isActive: true },
      });
      if (!arAccount) throw new NotFoundError(`AR account "${input.arAccountCode}"`);
      const vatAccount = await tx.account.findFirst({
        where: { companyId, code: input.vatPayableAccountCode, isActive: true },
      });
      if (!vatAccount) throw new NotFoundError(`VAT payable account "${input.vatPayableAccountCode}"`);

      const period = await assertOpenPeriodForDate(tx, companyId, invoiceDate);

      // Server recomputes every amount from the line inputs — never trusts a
      // client-supplied total, since a tampered frontend could send anything.
      const resolvedLines = await Promise.all(
        input.lines.map(async (line) => {
          const account = await tx.account.findFirst({
            where: { companyId, code: line.revenueAccountCode, isActive: true },
          });
          if (!account) throw new NotFoundError(`Revenue account "${line.revenueAccountCode}"`);

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

      const journalLines = buildSalesInvoiceJournalLines({
        arAccountId: arAccount.id,
        vatPayableAccountId: vatAccount.id,
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
          sourceType: "SALES_INVOICE",
          description: `Sales invoice ${input.invoiceNumber}`,
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

      const invoice = await tx.salesInvoice.create({
        data: {
          companyId,
          customerId: customer.id,
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
              revenueAccountId: l.account.id,
              amount: l.amount,
              vatRate: l.vatRate,
              vatAmount: l.vatAmount,
            })),
          },
        },
        include: { lines: true },
      });

      // journalEntry.sourceId is set after the invoice exists (chicken/egg: the
      // journal needs to exist before the invoice can reference it, and the
      // invoice needs to exist before the journal can reference it back).
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { sourceId: invoice.id },
      });

      await recordAuditLog(tx, {
        companyId,
        action: "SALES_INVOICE_POSTED",
        entityType: "SalesInvoice",
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

export async function getSalesInvoice(companyId: string, invoiceId: string) {
  return findSalesInvoiceOrThrow(prisma, companyId, invoiceId);
}

export async function listSalesInvoices(companyId: string) {
  return prisma.salesInvoice.findMany({
    where: { companyId },
    include: { customer: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getSalesInvoiceOutstandingBalance(companyId: string, invoiceId: string): Promise<Decimal> {
  const invoice = await findSalesInvoiceOrThrow(prisma, companyId, invoiceId);
  const allocations = await prisma.receiptAllocation.findMany({
    where: { invoiceId: invoice.id, receipt: { status: "POSTED" } },
  });
  const allocated = sum(allocations.map((a) => a.allocatedAmount));
  return invoice.totalAmount.minus(allocated);
}

/**
 * Cancels a posted invoice via accounting reversal: the original invoice and
 * journal entry are never mutated or deleted, a new reversal JournalEntry is
 * created with mirrored debit/credit lines, and the invoice status flips to
 * CANCELLED. Net GL impact of the pair is zero, but full history survives.
 */
export async function cancelSalesInvoice(companyId: string, invoiceId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundError("Sales invoice");
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
        description: `Reversal of sales invoice ${invoice.invoiceNumber}`,
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

    const updated = await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: { status: "CANCELLED" },
    });

    await recordAuditLog(tx, {
      companyId,
      action: "SALES_INVOICE_CANCELLED",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      beforeState: { status: invoice.status },
      afterState: { status: updated.status, reversalJournalEntryId: reversalJournal.id },
    });

    return updated;
  });
}
