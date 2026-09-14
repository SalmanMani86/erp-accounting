import { api } from "./client";
import type { Company } from "../types";

export const companiesApi = {
  list: () => api.get<Company[]>("/companies"),
  get: (companyId: string) => api.get<Company>(`/companies/${companyId}`),
  create: (input: { name: string; seedDefaultChartOfAccounts?: boolean }) =>
    api.post<Company>("/companies", input),
};
