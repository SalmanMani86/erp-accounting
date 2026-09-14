import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationFailedError, InvalidStateError } from "../../lib/errors";
import { findSupplierOrThrow } from "../../lib/scopedLookups";
import { assertOpenPeriodForDate } from "../fiscalPeriod/fiscalPeriod.service";
import { recordAuditLog } from "../auditLog/auditLog.service";
import { buildPaymentJournalLines } from "../../accounting-engine/buildSettlementJournal";
import { sum } from "../../accounting-engine/money";
import { isUniqueIdempotencyViolation, throwDuplicateRequestError } from "../../lib/idempotency";

export interface CreatePaymentAllocationInput {
  invoiceId: string;
  allocatedAmount: string | number;
}

export interface CreatePaymentInput {
  supplierId: string;
  paymentDate: string; // ISO date
  amount: string | number;
  bankAccountCode: string;
  apAccountCode: string;
  allocations: CreatePaymentAllocationInput[];
  idempotencyKey?: string;
}

/**
 * Records a supplier Payment, allocates it against one or more Purchase
 * Invoices, and posts the settlement journal entry, all in one transaction.
 * Mirrors createAndAllocateReceipt on the AP side, including row-locking
 * each targeted invoice to prevent concurrent over-allocation.
 */
export async function createAndAllocatePayment(companyId: string, input: CreatePaymentInput) {
  if (input.allocations.length === 0) {
    throw new ValidationFailedError("Payment must allocate to at least one invoice");
  }

  const amount = new Decimal(input.amount).toDecimalPlaces(2);
  if (amount.lessThanOrEqualTo(0)) {
    throw new ValidationFailedError("Payment amount must be greater than zero");
  }

  const allocationTotal = sum(input.allocations.map((a) => new Decimal(a.allocatedAmount).toDecimalPlaces(2)));
  if (!allocationTotal.equals(amount)) {
    throw new ValidationFailedError(
      `Sum of allocations (${allocationTotal.toFixed(2)}) must equal payment amount (${amount.toFixed(2)})`
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const paymentDate = new Date(input.paymentDate);

      const supplier = await findSupplierOrThrow(tx, companyId, input.supplierId);
      const bankAccount = await tx.account.findFirst({
        where: { companyId, code: input.bankAccountCode, isActive: true },
      });
      if (!bankAccount) throw new NotFoundError(`Bank account "${input.bankAccountCode}"`);
      const apAccount = await tx.account.findFirst({
        where: { companyId, code: input.apAccountCode, isActive: true },
      });
      if (!apAccount) throw new NotFoundError(`AP account "${input.apAccountCode}"`);

      const period = await assertOpenPeriodForDate(tx, companyId, paymentDate);

      for (const alloc of input.allocations) {
        const invoiceRows = await tx.$queryRaw<{ id: string; total_amount: Decimal; status: string }[]>`
          SELECT id, total_amount, status FROM purchase_invoices
          WHERE id = ${alloc.invoiceId} AND company_id = ${companyId}
          FOR UPDATE
        `;
        const invoice = invoiceRows[0];
        if (!invoice) throw new NotFoundError(`Purchase invoice ${alloc.invoiceId}`);
        if (invoice.status !== "POSTED") {
          throw new InvalidStateError(`Invoice ${alloc.invoiceId} is not POSTED and cannot receive payment`);
        }

        const existingAllocations = await tx.paymentAllocation.findMany({
          where: { invoiceId: invoice.id, payment: { status: "POSTED" } },
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

      const journalLines = buildPaymentJournalLines({
        bankAccountId: bankAccount.id,
        apAccountId: apAccount.id,
        amount,
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          fiscalPeriodId: period.id,
          entryDate: paymentDate,
          sourceType: "PAYMENT",
          description: `Payment to ${supplier.name}`,
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

      const payment = await tx.payment.create({
        data: {
          companyId,
          supplierId: supplier.id,
          fiscalPeriodId: period.id,
          paymentDate,
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

      await tx.journalEntry.update({ where: { id: journalEntry.id }, data: { sourceId: payment.id } });

      await recordAuditLog(tx, {
        companyId,
        action: "PAYMENT_POSTED",
        entityType: "Payment",
        entityId: payment.id,
        afterState: { amount: payment.amount.toString(), journalEntryId: journalEntry.id },
      });

      return payment;
    });
  } catch (error) {
    if (isUniqueIdempotencyViolation(error)) throwDuplicateRequestError();
    throw error;
  }
}

export async function listPayments(companyId: string) {
  return prisma.payment.findMany({
    where: { companyId },
    include: { supplier: true, allocations: true },
    orderBy: { paymentDate: "desc" },
  });
}
