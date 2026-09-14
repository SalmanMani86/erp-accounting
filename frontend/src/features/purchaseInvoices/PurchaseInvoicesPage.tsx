import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { purchaseInvoicesApi } from "../../api/purchaseInvoices";
import { suppliersApi } from "../../api/suppliers";
import { chartOfAccountsApi } from "../../api/chartOfAccounts";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { formatDate, formatMoney } from "../../lib/format";
import { genIdempotencyKey } from "../../api/client";
import { PurchaseInvoiceDetailDrawer } from "./PurchaseInvoiceDetailDrawer";

export function PurchaseInvoicesPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: invoices, isLoading, error, reload } = useApi(
    () => purchaseInvoicesApi.list(companyId),
    [companyId]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        description="Posting a purchase invoice creates: Dr Expense + Dr VAT Receivable = Cr Accounts Payable."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New purchase invoice</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState title="No purchase invoices yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Invoice #</TH>
              <TH>Supplier</TH>
              <TH>Date</TH>
              <TH align="right">Total</TH>
              <TH align="center">Status</TH>
            </tr>
          </THead>
          <TBody>
            {invoices.map((inv) => (
              <TR key={inv.id} onClick={() => setSelectedId(inv.id)}>
                <TD className="font-medium text-slate-900">{inv.invoiceNumber}</TD>
                <TD className="text-slate-500">{inv.supplier?.name ?? "—"}</TD>
                <TD>{formatDate(inv.invoiceDate)}</TD>
                <TD align="right" className="font-medium">
                  SAR {formatMoney(inv.totalAmount)}
                </TD>
                <TD align="center">
                  <StatusBadge status={inv.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreatePurchaseInvoiceModal
          companyId={companyId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            reload();
          }}
        />
      )}

      {selectedId && (
        <PurchaseInvoiceDetailDrawer
          companyId={companyId}
          invoiceId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

interface LineDraft {
  description: string;
  expenseAccountCode: string;
  amount: string;
  vatRate: string;
}

function CreatePurchaseInvoiceModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: suppliers } = useApi(() => suppliersApi.list(companyId), [companyId]);
  const { data: accounts } = useApi(() => chartOfAccountsApi.list(companyId), [companyId]);
  const expenseAccounts = accounts?.filter((a) => a.type === "EXPENSE") ?? [];

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineDraft[]>([
    { description: "", expenseAccountCode: "", amount: "", vatRate: "15" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const vatTotal = lines.reduce((sum, l) => sum + ((Number(l.amount) || 0) * (Number(l.vatRate) || 0)) / 100, 0);
  const total = subtotal + vatTotal;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { description: "", expenseAccountCode: "", amount: "", vatRate: "15" }]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await purchaseInvoicesApi.create(
        companyId,
        {
          supplierId,
          invoiceNumber,
          invoiceDate,
          lines: lines.map((l) => ({
            description: l.description,
            expenseAccountCode: l.expenseAccountCode,
            amount: Number(l.amount),
            vatRate: Number(l.vatRate),
          })),
        },
        genIdempotencyKey()
      );
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New purchase invoice" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Supplier">
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice number">
            <Input required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </Field>
          <Field label="Invoice date">
            <Input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Line items</span>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>
              Add line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-2.5">
                <div className="col-span-4">
                  <Field label="Description">
                    <Input
                      required
                      value={line.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      placeholder="e.g. Vehicle parts"
                    />
                  </Field>
                </div>
                <div className="col-span-3">
                  <Field label="Expense account">
                    <Select
                      required
                      value={line.expenseAccountCode}
                      onChange={(e) => updateLine(i, { expenseAccountCode: e.target.value })}
                    >
                      <option value="">Select</option>
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.code}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Amount">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={line.amount}
                      onChange={(e) => updateLine(i, { amount: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="VAT %">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={line.vatRate}
                      onChange={(e) => updateLine(i, { vatRate: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="col-span-1">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                      aria-label="Remove line"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>SAR {formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>VAT</span>
              <span>SAR {formatMoney(vatTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Total</span>
              <span>SAR {formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Post invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
