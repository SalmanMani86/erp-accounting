import { api } from "./client";
import type { Account, AccountType } from "../types";

export const chartOfAccountsApi = {
  list: (companyId: string) => api.get<Account[]>(`/companies/${companyId}/chart-of-accounts`),
  create: (companyId: string, input: { code: string; name: string; type: AccountType }) =>
    api.post<Account>(`/companies/${companyId}/chart-of-accounts`, input),
};
