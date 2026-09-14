import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { assertOpenPeriodForDate } from "../fiscalPeriod/fiscalPeriod.service";
import { recordAuditLog } from "../auditLog/auditLog.service";
import { validateBalancedLines } from "../../accounting-engine/validateBalance";

export interface ManualJournalLineInput {
  accountCode: string;
  debit?: string | number;
  credit?: string | number;
}

export interface CreateManualJournalInput {
  entryDate: string;
  description?: string;
  lines: ManualJournalLineInput[];
}

/**
 * Posts a manual journal entry directly (not generated from an operational
 * document). Still goes through the same balance validation and period-lock
 * check as every other posting path — there is exactly one way into the
 * ledger, whether the source is an invoice, a receipt, or a manual entry.
 */
export async function createManualJournalEntry(companyId: string, input: CreateManualJournalInput) {
  return prisma.$transaction(async (tx) => {
    const entryDate = new Date(input.entryDate);
    const period = await assertOpenPeriodForDate(tx, companyId, entryDate);

    const resolvedLines = await Promise.all(
      input.lines.map(async (line) => {
        const account = await tx.account.findFirst({
          where: { companyId, code: line.accountCode, isActive: true },
        });
        if (!account) throw new NotFoundError(`Account "${line.accountCode}"`);
        return {
          accountId: account.id,
          debit: new Decimal(line.debit ?? 0).toDecimalPlaces(2),
          credit: new Decimal(line.credit ?? 0).toDecimalPlaces(2),
        };
      })
    );

    validateBalancedLines(resolvedLines);

    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        fiscalPeriodId: period.id,
        entryDate,
        sourceType: "MANUAL",
        description: input.description,
        lines: {
          create: resolvedLines.map((l, idx) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            lineOrder: idx,
          })),
        },
      },
      include: { lines: true },
    });

    await recordAuditLog(tx, {
      companyId,
      action: "MANUAL_JOURNAL_POSTED",
      entityType: "JournalEntry",
      entityId: journalEntry.id,
      afterState: { description: journalEntry.description, lineCount: resolvedLines.length },
    });

    return journalEntry;
  });
}

export async function listJournalEntries(companyId: string) {
  return prisma.journalEntry.findMany({
    where: { companyId },
    include: { lines: { include: { account: true } } },
    orderBy: { entryDate: "desc" },
  });
}

export async function getJournalEntry(companyId: string, id: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId },
    include: { lines: { include: { account: true } } },
  });
  if (!entry) throw new NotFoundError("Journal entry");
  return entry;
}
