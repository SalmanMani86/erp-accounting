import { api } from "./client";
import type { Receipt } from "../types";

export interface CreateReceiptInput {
  customerId: string;
  receiptDate: string;
  amount: number;
  bankAccountCode?: string;
  arAccountCode?: string;
  allocations: { invoiceId: string; allocatedAmount: number }[];
}

export const receiptsApi = {
  list: (companyId: string) => api.get<Receipt[]>(`/companies/${companyId}/receipts`),
  create: (companyId: string, input: CreateReceiptInput, idempotencyKey: string) =>
    api.post<Receipt>(`/companies/${companyId}/receipts`, input, idempotencyKey),
};
