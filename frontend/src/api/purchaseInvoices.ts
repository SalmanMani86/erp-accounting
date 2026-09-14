import { api } from "./client";
import type { PurchaseInvoice } from "../types";

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  apAccountCode?: string;
  vatReceivableAccountCode?: string;
  lines: { description: string; expenseAccountCode: string; amount: number; vatRate: number }[];
}

export const purchaseInvoicesApi = {
  list: (companyId: string) => api.get<PurchaseInvoice[]>(`/companies/${companyId}/purchase-invoices`),
  get: (companyId: string, id: string) =>
    api.get<PurchaseInvoice>(`/companies/${companyId}/purchase-invoices/${id}`),
  create: (companyId: string, input: CreatePurchaseInvoiceInput, idempotencyKey: string) =>
    api.post<PurchaseInvoice>(`/companies/${companyId}/purchase-invoices`, input, idempotencyKey),
  cancel: (companyId: string, id: string) =>
    api.post<PurchaseInvoice>(`/companies/${companyId}/purchase-invoices/${id}/cancel`),
};
