import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getTrialBalanceHandler, getProfitAndLossHandler, getBalanceSheetHandler, getAccountLedgerHandler } from "./reports.controller";

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.get("/trial-balance", asyncHandler(getTrialBalanceHandler));
reportsRouter.get("/profit-and-loss", asyncHandler(getProfitAndLossHandler));
reportsRouter.get("/balance-sheet", asyncHandler(getBalanceSheetHandler));

export const generalLedgerRouter = Router({ mergeParams: true });

generalLedgerRouter.get("/:accountId", asyncHandler(getAccountLedgerHandler));
