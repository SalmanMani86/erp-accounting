import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { receiptsApi } from "../../api/receipts";
import { customersApi } from "../../api/customers";
import { salesInvoicesApi } from "../../api/salesInvoices";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { formatDate, formatMoney } from "../../lib/format";
import { genIdempotencyKey } from "../../api/client";

export function ReceiptsPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: receipts, isLoading, error, reload } = useApi(() => receiptsApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="A receipt posts Dr Cash/Bank = Cr Accounts Receivable and settles against one or more sales invoices."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New receipt</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !receipts || receipts.length === 0 ? (
        <EmptyState title="No receipts yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH align="right">Amount</TH>
              <TH>Allocated to</TH>
              <TH align="center">Status</TH>
            </tr>
          </THead>
          <TBody>
            {receipts.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium text-slate-900">{r.customer?.name ?? "—"}</TD>
                <TD>{formatDate(r.receiptDate)}</TD>
                <TD align="right" className="font-medium">
                  SAR {formatMoney(r.amount)}
                </TD>
                <TD className="text-slate-500">{r.allocations.length} invoice(s)</TD>
                <TD align="center">
                  <StatusBadge status={r.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreateReceiptModal
          companyId={companyId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CreateReceiptModal({
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Receipt date">
            <Input type="date" required value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
          </Field>
          <Field label="Amount received">
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
            Post receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}
