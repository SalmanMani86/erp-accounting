import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/prisma";
import { AccountAggregate, computeTrialBalance, computeProfitAndLoss, computeBalanceSheet } from "../../accounting-engine/reports";
import { AccountType } from "@prisma/client";

/**
 * Aggregates every posted journal line for this company (optionally scoped
 * to one fiscal period) into one row per account. This is the General
 * Ledger — computed directly from journal_entry_lines, never a separate
 * stored table, so it cannot drift from the journal.
 */
async function loadAccountAggregates(companyId: string, opts?: { fiscalPeriodId?: string; upToDate?: Date }): Promise<AccountAggregate[]> {
  const accounts = await prisma.account.findMany({ where: { companyId, isActive: true } });

  const rows = await prisma.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      account: { companyId },
      journalEntry: {
        companyId,
        ...(opts?.fiscalPeriodId ? { fiscalPeriodId: opts.fiscalPeriodId } : {}),
        ...(opts?.upToDate ? { entryDate: { lte: opts.upToDate } } : {}),
      },
    },
    _sum: { debit: true, credit: true },
  });

  const sumsByAccount = new Map<string, { debit: Decimal; credit: Decimal }>();
  for (const row of rows) {
    sumsByAccount.set(row.accountId, {
      debit: row._sum.debit ?? new Decimal(0),
      credit: row._sum.credit ?? new Decimal(0),
    });
  }

  return accounts.map((account) => {
    const sums = sumsByAccount.get(account.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };
    return {
      account: { id: account.id, code: account.code, name: account.name, type: account.type as AccountType },
      totalDebit: sums.debit,
      totalCredit: sums.credit,
    };
  });
}

export async function getTrialBalance(companyId: string, fiscalPeriodId?: string) {
  const aggregates = await loadAccountAggregates(companyId, { fiscalPeriodId });
  return computeTrialBalance(aggregates);
}

export async function getProfitAndLoss(companyId: string, opts?: { fiscalPeriodId?: string; upToDate?: Date }) {
  const aggregates = await loadAccountAggregates(companyId, opts);
  return computeProfitAndLoss(aggregates);
}

export async function getBalanceSheet(companyId: string, upToDate?: Date) {
  const aggregates = await loadAccountAggregates(companyId, { upToDate });
  return computeBalanceSheet(aggregates);
}

/**
 * General Ledger detail for one account: every posted journal line
 * affecting it, in date order, with a running balance.
 */
export async function getAccountLedger(companyId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) return null;

  const lines = await prisma.journalEntryLine.findMany({
    where: { accountId, journalEntry: { companyId } },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { entryDate: "asc" } }, { journalEntry: { createdAt: "asc" } }],
  });

  const debitNormal = account.type === "ASSET" || account.type === "EXPENSE";
  let running = new Decimal(0);

  const entries = lines.map((line) => {
    const delta = debitNormal ? line.debit.minus(line.credit) : line.credit.minus(line.debit);
    running = running.plus(delta);
    return {
      journalEntryId: line.journalEntryId,
      entryDate: line.journalEntry.entryDate,
      sourceType: line.journalEntry.sourceType,
      description: line.journalEntry.description,
      debit: line.debit,
      credit: line.credit,
      runningBalance: running,
    };
  });

  return { account, entries };
}
