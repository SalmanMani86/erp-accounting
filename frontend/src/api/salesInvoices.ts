import { api } from "./client";
import type { SalesInvoice } from "../types";

export interface CreateSalesInvoiceInput {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  arAccountCode?: string;
  vatPayableAccountCode?: string;
  lines: { description: string; revenueAccountCode: string; amount: number; vatRate: number }[];
}

export const salesInvoicesApi = {
  list: (companyId: string) => api.get<SalesInvoice[]>(`/companies/${companyId}/sales-invoices`),
  get: (companyId: string, id: string) => api.get<SalesInvoice>(`/companies/${companyId}/sales-invoices/${id}`),
  create: (companyId: string, input: CreateSalesInvoiceInput, idempotencyKey: string) =>
    api.post<SalesInvoice>(`/companies/${companyId}/sales-invoices`, input, idempotencyKey),
  cancel: (companyId: string, id: string) =>
    api.post<SalesInvoice>(`/companies/${companyId}/sales-invoices/${id}/cancel`),
};
