import { useState } from "react";
import { useApi } from "../../lib/useApi";
import { paymentsApi } from "../../api/payments";
import { suppliersApi } from "../../api/suppliers";
import { purchaseInvoicesApi } from "../../api/purchaseInvoices";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { formatMoney } from "../../lib/format";
import { genIdempotencyKey } from "../../api/client";

export function CreatePaymentModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: suppliers } = useApi(() => suppliersApi.list(companyId), [companyId]);
  const { data: invoices } = useApi(() => purchaseInvoicesApi.list(companyId), [companyId]);

  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supplierInvoices = (invoices ?? []).filter(
    (inv) => inv.supplierId === supplierId && inv.status === "POSTED"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await paymentsApi.create(
        companyId,
        {
          supplierId,
          paymentDate,
          amount: Number(amount),
          allocations: [{ invoiceId: selectedInvoiceId, allocatedAmount: Number(amount) }],
        },
        genIdempotencyKey()
      );
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post payment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Supplier">
          <Select
            required
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setSelectedInvoiceId("");
            }}
          >
            <option value="">Select supplier</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Invoice to settle" hint="Only posted invoices for this supplier are shown.">
          <Select
            required
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            disabled={!supplierId}
          >
            <option value="">Select invoice</option>
            {supplierInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} · SAR {formatMoney(inv.totalAmount)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment date">
            <Input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </Field>
          <Field label="Amount paid">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Post payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
