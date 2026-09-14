import { api } from "./client";
import type { AccountLedger, BalanceSheet, ProfitAndLoss, TrialBalance } from "../types";

export const reportsApi = {
  trialBalance: (companyId: string, periodId?: string) =>
    api.get<TrialBalance>(`/companies/${companyId}/reports/trial-balance${periodId ? `?periodId=${periodId}` : ""}`),
  profitAndLoss: (companyId: string) => api.get<ProfitAndLoss>(`/companies/${companyId}/reports/profit-and-loss`),
  balanceSheet: (companyId: string) => api.get<BalanceSheet>(`/companies/${companyId}/reports/balance-sheet`),
  accountLedger: (companyId: string, accountId: string) =>
    api.get<AccountLedger>(`/companies/${companyId}/general-ledger/${accountId}`),
};
