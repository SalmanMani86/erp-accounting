import { useApi } from "./useApi";

interface HasOutstandingBalance {
  outstandingBalance?: string;
}

/**
 * Fetches the live outstanding balance for a selected invoice and derives
 * whether a candidate payment/receipt amount would exceed it. Shared by the
 * Receipt and Payment forms so the cap logic (and any future tolerance
 * rule) lives in exactly one place.
 */
export function useOutstandingBalance<T extends HasOutstandingBalance>(
  fetchInvoice: (companyId: string, invoiceId: string) => Promise<T>,
  companyId: string,
  invoiceId: string,
  amount: string
) {
  const { data: invoice } = useApi(
    () => (invoiceId ? fetchInvoice(companyId, invoiceId) : Promise.resolve(null)),
    [companyId, invoiceId]
  );

  const outstandingBalance = invoice?.outstandingBalance !== undefined ? Number(invoice.outstandingBalance) : null;
  const amountExceedsBalance = outstandingBalance !== null && Number(amount) > outstandingBalance;

  return { outstandingBalance, amountExceedsBalance };
}
