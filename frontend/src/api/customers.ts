import { api } from "./client";
import type { Customer } from "../types";

export const customersApi = {
  list: (companyId: string) => api.get<Customer[]>(`/companies/${companyId}/customers`),
  get: (companyId: string, id: string) => api.get<Customer>(`/companies/${companyId}/customers/${id}`),
  create: (companyId: string, input: { name: string; email?: string }) =>
    api.post<Customer>(`/companies/${companyId}/customers`, input),
};
