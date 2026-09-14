import { api } from "./client";
import type { FiscalPeriod } from "../types";

export const fiscalPeriodsApi = {
  list: (companyId: string) => api.get<FiscalPeriod[]>(`/companies/${companyId}/fiscal-periods`),
  create: (companyId: string, input: { name: string; startDate: string; endDate: string }) =>
    api.post<FiscalPeriod>(`/companies/${companyId}/fiscal-periods`, input),
  close: (companyId: string, id: string) =>
    api.post<FiscalPeriod>(`/companies/${companyId}/fiscal-periods/${id}/close`),
};
