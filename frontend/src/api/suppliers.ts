import { api } from "./client";
import type { Supplier } from "../types";

export const suppliersApi = {
  list: (companyId: string) => api.get<Supplier[]>(`/companies/${companyId}/suppliers`),
  get: (companyId: string, id: string) => api.get<Supplier>(`/companies/${companyId}/suppliers/${id}`),
  create: (companyId: string, input: { name: string; email?: string }) =>
    api.post<Supplier>(`/companies/${companyId}/suppliers`, input),
};
