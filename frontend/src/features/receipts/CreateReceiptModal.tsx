import { useState } from "react";
import { useApi } from "../../lib/useApi";
import { useOutstandingBalance } from "../../lib/useOutstandingBalance";
import { receiptsApi } from "../../api/receipts";
import { customersApi } from "../../api/customers";
import { salesInvoicesApi } from "../../api/salesInvoices";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { OutstandingBalanceBanner, ExceedsBalanceWarning } from "../../components/OutstandingBalanceHint";
import { formatMoney } from "../../lib/format";
import { genIdempotencyKey } from "../../api/client";

export function CreateReceiptModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: customers } = useApi(() => customersApi.list(companyId), [companyId]);
  const { data: invoices } = useApi(() => salesInvoicesApi.list(companyId), [companyId]);

  const [customerId, setCustomerId] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerInvoices = (invoices ?? []).filter(
    (inv) => inv.customerId === customerId && inv.status === "POSTED"
  );

  const { outstandingBalance, amountExceedsBalance } = useOutstandingBalance(
    salesInvoicesApi.get,
    companyId,
    selectedInvoiceId,
    amount
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await receiptsApi.create(
        companyId,
        {
          customerId,
          receiptDate,
          amount: Number(amount),
          allocations: [{ invoiceId: selectedInvoiceId, allocatedAmount: Number(amount) }],
        },
        genIdempotencyKey()
      );
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post receipt");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New receipt" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Customer">
          <Select
            required
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setSelectedInvoiceId("");
            }}
          >
            <option value="">Select customer</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Invoice to settle" hint="Only posted invoices for this customer are shown.">
          <Select
            required
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            disabled={!customerId}
          >
            <option value="">Select invoice</option>
            {customerInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} · SAR {formatMoney(inv.totalAmount)}
              </option>
            ))}
          </Select>
        </Field>

        {outstandingBalance !== null && <OutstandingBalanceBanner amount={outstandingBalance} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Receipt date">
            <Input type="date" required value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </Field>
          <Field label="Amount received">
            <Input
              type="number"
              min="0.01"
              max={outstandingBalance ?? undefined}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountExceedsBalance && <ExceedsBalanceWarning limit={outstandingBalance!} />}
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={amountExceedsBalance}>
            Post receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}
