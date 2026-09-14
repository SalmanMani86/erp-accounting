import { Request, Response } from "express";
import { getTrialBalance, getProfitAndLoss, getBalanceSheet, getAccountLedger } from "./reports.service";
import { NotFoundError } from "../../lib/errors";

export async function getTrialBalanceHandler(req: Request, res: Response): Promise<void> {
  const fiscalPeriodId = typeof req.query.periodId === "string" ? req.query.periodId : undefined;
  const tb = await getTrialBalance(req.companyId, fiscalPeriodId);
  res.json(tb);
}

export async function getProfitAndLossHandler(req: Request, res: Response): Promise<void> {
  const fiscalPeriodId = typeof req.query.periodId === "string" ? req.query.periodId : undefined;
  const upToDate = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  const pnl = await getProfitAndLoss(req.companyId, { fiscalPeriodId, upToDate });
  res.json(pnl);
}

export async function getBalanceSheetHandler(req: Request, res: Response): Promise<void> {
  const asOf = typeof req.query.asOf === "string" ? new Date(req.query.asOf) : undefined;
  const bs = await getBalanceSheet(req.companyId, asOf);
  res.json(bs);
}

export async function getAccountLedgerHandler(req: Request, res: Response): Promise<void> {
  const ledger = await getAccountLedger(req.companyId, req.params.accountId);
  if (!ledger) throw new NotFoundError("Account");
  res.json(ledger);
}
