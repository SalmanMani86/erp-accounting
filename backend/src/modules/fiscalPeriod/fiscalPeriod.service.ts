import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError, PeriodClosedError, ConflictError } from "../../lib/errors";

type TxClient = Prisma.TransactionClient;

/**
 * Resolves the fiscal period that owns `entryDate` for this company and
 * asserts it is OPEN. Must be called inside the same transaction that
 * performs the posting, so a period closed concurrently cannot race a
 * write that assumed it was still open.
 */
export async function assertOpenPeriodForDate(
  tx: TxClient,
  companyId: string,
  entryDate: Date
): Promise<{ id: string; name: string }> {
  const period = await tx.fiscalPeriod.findFirst({
    where: {
      companyId,
      startDate: { lte: entryDate },
      endDate: { gte: entryDate },
    },
  });

  if (!period) {
    throw new NotFoundError("Fiscal period covering the given date");
  }
  if (period.status === "CLOSED") {
    throw new PeriodClosedError(period.name);
  }

  return { id: period.id, name: period.name };
}

export async function listFiscalPeriods(companyId: string) {
  return prisma.fiscalPeriod.findMany({
    where: { companyId },
    orderBy: { startDate: "asc" },
  });
}

export async function createFiscalPeriod(
  companyId: string,
  input: { name: string; startDate: Date; endDate: Date }
) {
  // Two periods with overlapping date ranges would make assertOpenPeriodForDate's
  // lookup ambiguous — a date inside the overlap could resolve to either period,
  // silently picking whichever one Postgres returns first. Overlap is rejected
  // here so that never becomes possible.
  const overlapping = await prisma.fiscalPeriod.findFirst({
    where: {
      companyId,
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });
  if (overlapping) {
    throw new ConflictError(
      `Date range overlaps existing fiscal period "${overlapping.name}" (${overlapping.startDate.toISOString().slice(0, 10)} to ${overlapping.endDate.toISOString().slice(0, 10)})`
    );
  }

  return prisma.fiscalPeriod.create({
    data: {
      companyId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "OPEN",
    },
  });
}

export async function closeFiscalPeriod(companyId: string, periodId: string) {
  return prisma.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findFirst({ where: { id: periodId, companyId } });
    if (!period) {
      throw new NotFoundError("Fiscal period");
    }
    if (period.status === "CLOSED") {
      return period;
    }

    const updated = await tx.fiscalPeriod.update({
      where: { id: period.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        companyId,
        action: "PERIOD_CLOSED",
        entityType: "FiscalPeriod",
        entityId: period.id,
        beforeState: { status: period.status },
        afterState: { status: updated.status, closedAt: updated.closedAt },
      },
    });

    return updated;
  });
}
