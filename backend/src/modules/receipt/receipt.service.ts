import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationFailedError, InvalidStateError } from "../../lib/errors";
import { findCustomerOrThrow } from "../../lib/scopedLookups";
import { assertOpenPeriodForDate } from "../fiscalPeriod/fiscalPeriod.service";
import { recordAuditLog } from "../auditLog/auditLog.service";
import { buildReceiptJournalLines } from "../../accounting-engine/buildSettlementJournal";
import { sum } from "../../accounting-engine/money";
import { isUniqueIdempotencyViolation, throwDuplicateRequestError } from "../../lib/idempotency";

export interface CreateReceiptAllocationInput {
  invoiceId: string;
  allocatedAmount: string | number;
}

export interface CreateReceiptInput {
  customerId: string;
  receiptDate: string; // ISO date
  amount: string | number;
  bankAccountCode: string;
  arAccountCode: string;
  allocations: CreateReceiptAllocationInput[];
  idempotencyKey?: string;
}

/**
 * Records a customer Receipt, allocates it against one or more Sales
 * Invoices, and posts the settlement journal entry, all in one transaction.
 *
 * Each targeted invoice row is locked (`SELECT ... FOR UPDATE`) before its
 * outstanding balance is computed, so two concurrent receipts against the
 * same invoice cannot both read a stale balance and jointly over-allocate
 * past the invoice total.
 */
export async function createAndAllocateReceipt(companyId: string, input: CreateReceiptInput) {
  if (input.allocations.length === 0) {
    throw new ValidationFailedError("Receipt must allocate to at least one invoice");
  }

  const amount = new Decimal(input.amount).toDecimalPlaces(2);
  if (amount.lessThanOrEqualTo(0)) {
    throw new ValidationFailedError("Receipt amount must be greater than zero");
  }

  const allocationTotal = sum(input.allocations.map((a) => new Decimal(a.allocatedAmount).toDecimalPlaces(2)));
  if (!allocationTotal.equals(amount)) {
    throw new ValidationFailedError(
      `Sum of allocations (${allocationTotal.toFixed(2)}) must equal receipt amount (${amount.toFixed(2)})`
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const receiptDate = new Date(input.receiptDate);

      const customer = await findCustomerOrThrow(tx, companyId, input.customerId);
      const bankAccount = await tx.account.findFirst({
        where: { companyId, code: input.bankAccountCode, isActive: true },
      });
      if (!bankAccount) throw new NotFoundError(`Bank account "${input.bankAccountCode}"`);
      const arAccount = await tx.account.findFirst({
        where: { companyId, code: input.arAccountCode, isActive: true },
      });
      if (!arAccount) throw new NotFoundError(`AR account "${input.arAccountCode}"`);

      const period = await assertOpenPeriodForDate(tx, companyId, receiptDate);

      // Lock each target invoice row and validate the allocation against its
      // CURRENT outstanding balance, inside the transaction, so a concurrent
      // second receipt against the same invoice must wait for this one to
      // commit (or roll back) before it can read a balance to allocate against.
      for (const alloc of input.allocations) {
        const invoiceRows = await tx.$queryRaw<{ id: string; total_amount: Decimal; status: string }[]>`
          SELECT id, total_amount, status FROM sales_invoices
          WHERE id = ${alloc.invoiceId} AND company_id = ${companyId}
          FOR UPDATE
        `;
        const invoice = invoiceRows[0];
        if (!invoice) throw new NotFoundError(`Sales invoice ${alloc.invoiceId}`);
        if (invoice.status !== "POSTED") {
          throw new InvalidStateError(`Invoice ${alloc.invoiceId} is not POSTED and cannot receive payment`);
        }

        const existingAllocations = await tx.receiptAllocation.findMany({
          where: { invoiceId: invoice.id, receipt: { status: "POSTED" } },
        });
        const alreadyAllocated = sum(existingAllocations.map((a) => a.allocatedAmount));
        const outstanding = new Decimal(invoice.total_amount).minus(alreadyAllocated);
        const requested = new Decimal(alloc.allocatedAmount).toDecimalPlaces(2);

        if (requested.greaterThan(outstanding)) {
          throw new ValidationFailedError(
            `Allocation of ${requested.toFixed(2)} exceeds outstanding balance ${outstanding.toFixed(2)} for invoice ${alloc.invoiceId}`
          );
        }
      }

      const journalLines = buildReceiptJournalLines({
        bankAccountId: bankAccount.id,
        arAccountId: arAccount.id,
        amount,
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          fiscalPeriodId: period.id,
          entryDate: receiptDate,
          sourceType: "RECEIPT",
          description: `Receipt from ${customer.name}`,
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

      const receipt = await tx.receipt.create({
        data: {
          companyId,
          customerId: customer.id,
          fiscalPeriodId: period.id,
          receiptDate,
          amount,
          bankAccountId: bankAccount.id,
          status: "POSTED",
          journalEntryId: journalEntry.id,
          idempotencyKey: input.idempotencyKey,
          allocations: {
            create: input.allocations.map((a) => ({
              invoiceId: a.invoiceId,
              allocatedAmount: new Decimal(a.allocatedAmount).toDecimalPlaces(2),
            })),
          },
        },
        include: { allocations: true },
      });

      await tx.journalEntry.update({ where: { id: journalEntry.id }, data: { sourceId: receipt.id } });

      await recordAuditLog(tx, {
        companyId,
        action: "RECEIPT_POSTED",
        entityType: "Receipt",
        entityId: receipt.id,
        afterState: { amount: receipt.amount.toString(), journalEntryId: journalEntry.id },
      });

      return receipt;
    });
  } catch (error) {
    if (isUniqueIdempotencyViolation(error)) throwDuplicateRequestError();
    throw error;
  }
}

export async function listReceipts(companyId: string) {
  return prisma.receipt.findMany({
    where: { companyId },
    include: { customer: true, allocations: true },
    orderBy: { receiptDate: "desc" },
  });
}
