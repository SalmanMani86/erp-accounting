import { api } from "./client";
import type { Payment } from "../types";

export interface CreatePaymentInput {
  supplierId: string;
  paymentDate: string;
  amount: number;
  bankAccountCode?: string;
  apAccountCode?: string;
  allocations: { invoiceId: string; allocatedAmount: number }[];
}

export const paymentsApi = {
  list: (companyId: string) => api.get<Payment[]>(`/companies/${companyId}/payments`),
  create: (companyId: string, input: CreatePaymentInput, idempotencyKey: string) =>
    api.post<Payment>(`/companies/${companyId}/payments`, input, idempotencyKey),
};
