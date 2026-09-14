import { Decimal } from "@prisma/client/runtime/library";
import { AccountRef, AccountType } from "./types";
import { sum, ZERO } from "./money";

export interface AccountAggregate {
  account: AccountRef;
  totalDebit: Decimal;
  totalCredit: Decimal;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  totalDebit: Decimal;
  totalCredit: Decimal;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: Decimal;
  totalCredit: Decimal;
  isBalanced: boolean;
}

/** Accounts with these types carry a normal debit balance; others carry a normal credit balance. */
const DEBIT_NORMAL_TYPES: AccountType[] = ["ASSET", "EXPENSE"];

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL_TYPES.includes(type);
}

/** Signed balance for a single account, positive means "normal side", per its type. */
export function netBalance(aggregate: AccountAggregate): Decimal {
  const { account, totalDebit, totalCredit } = aggregate;
  return isDebitNormal(account.type) ? totalDebit.minus(totalCredit) : totalCredit.minus(totalDebit);
}

export function computeTrialBalance(aggregates: AccountAggregate[]): TrialBalance {
  const rows: TrialBalanceRow[] = aggregates.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    type: a.account.type,
    totalDebit: a.totalDebit,
    totalCredit: a.totalCredit,
  }));

  const totalDebit = sum(rows.map((r) => r.totalDebit));
  const totalCredit = sum(rows.map((r) => r.totalCredit));

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: totalDebit.toDecimalPlaces(2).equals(totalCredit.toDecimalPlaces(2)),
  };
}

export interface ProfitAndLoss {
  revenueLines: { accountId: string; code: string; name: string; amount: Decimal }[];
  expenseLines: { accountId: string; code: string; name: string; amount: Decimal }[];
  totalRevenue: Decimal;
  totalExpense: Decimal;
  netIncome: Decimal;
}

export function computeProfitAndLoss(aggregates: AccountAggregate[]): ProfitAndLoss {
  const revenueAggs = aggregates.filter((a) => a.account.type === "REVENUE");
  const expenseAggs = aggregates.filter((a) => a.account.type === "EXPENSE");

  const revenueLines = revenueAggs.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    amount: netBalance(a),
  }));
  const expenseLines = expenseAggs.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    amount: netBalance(a),
  }));

  const totalRevenue = sum(revenueLines.map((r) => r.amount));
  const totalExpense = sum(expenseLines.map((r) => r.amount));

  return {
    revenueLines,
    expenseLines,
    totalRevenue,
    totalExpense,
    netIncome: totalRevenue.minus(totalExpense),
  };
}

export interface BalanceSheet {
  assetLines: { accountId: string; code: string; name: string; amount: Decimal }[];
  liabilityLines: { accountId: string; code: string; name: string; amount: Decimal }[];
  equityLines: { accountId: string; code: string; name: string; amount: Decimal }[];
  totalAssets: Decimal;
  totalLiabilities: Decimal;
  totalEquity: Decimal;
  /** Current-period net income, included as a computed equity line so Assets = Liabilities + Equity holds
   *  without requiring a formal period-end closing journal entry. */
  currentPeriodNetIncome: Decimal;
  isBalanced: boolean;
}

export function computeBalanceSheet(aggregates: AccountAggregate[]): BalanceSheet {
  const assetAggs = aggregates.filter((a) => a.account.type === "ASSET");
  const liabilityAggs = aggregates.filter((a) => a.account.type === "LIABILITY");
  const equityAggs = aggregates.filter((a) => a.account.type === "EQUITY");

  const assetLines = assetAggs.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    amount: netBalance(a),
  }));
  const liabilityLines = liabilityAggs.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    amount: netBalance(a),
  }));
  const equityLines = equityAggs.map((a) => ({
    accountId: a.account.id,
    code: a.account.code,
    name: a.account.name,
    amount: netBalance(a),
  }));

  const { netIncome } = computeProfitAndLoss(aggregates);

  const totalAssets = sum(assetLines.map((l) => l.amount));
  const totalLiabilities = sum(liabilityLines.map((l) => l.amount));
  const totalEquity = sum(equityLines.map((l) => l.amount)).plus(netIncome);

  return {
    assetLines,
    liabilityLines,
    equityLines,
    totalAssets,
    totalLiabilities,
    totalEquity,
    currentPeriodNetIncome: netIncome,
    isBalanced: totalAssets.toDecimalPlaces(2).equals(totalLiabilities.plus(totalEquity).toDecimalPlaces(2)),
  };
}

export function outstandingInvoiceBalance(totalAmount: Decimal, allocatedAmounts: Decimal[]): Decimal {
  return totalAmount.minus(sum(allocatedAmounts.length ? allocatedAmounts : [ZERO]));
}
