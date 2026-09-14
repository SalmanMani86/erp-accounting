import { useState } from "react";
import { useApi } from "../../lib/useApi";
import { salesInvoicesApi } from "../../api/salesInvoices";
import { Modal } from "../../components/Modal";
import { FullPageSpinner, ErrorBanner } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatDate, formatMoney } from "../../lib/format";

export function InvoiceDetailDrawer({
  companyId,
  invoiceId,
  onClose,
  onChanged,
}: {
  companyId: string;
  invoiceId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: invoice, isLoading, error, reload } = useApi(
    () => salesInvoicesApi.get(companyId, invoiceId),
    [companyId, invoiceId]
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm("Cancel this invoice? A reversal journal entry will be posted; nothing is deleted.")) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await salesInvoicesApi.cancel(companyId, invoiceId);
      reload();
      onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Modal title={invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice"} onClose={onClose} widthClassName="max-w-xl">
      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : invoice ? (
        <div className="space-y-5">
          {cancelError && <ErrorBanner message={cancelError} />}

          <div className="flex items-center justify-between">
            <StatusBadge status={invoice.status} />
            <span className="text-xs text-slate-400">{formatDate(invoice.invoiceDate)}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Subtotal</p>
              <p className="font-medium text-slate-800">SAR {formatMoney(invoice.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">VAT</p>
              <p className="font-medium text-slate-800">SAR {formatMoney(invoice.vatAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total</p>
              <p className="font-medium text-slate-800">SAR {formatMoney(invoice.totalAmount)}</p>
            </div>
          </div>

          {invoice.outstandingBalance !== undefined && (
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm">
              <span className="text-brand-700">Outstanding balance: </span>
              <span className="font-semibold text-brand-800">SAR {formatMoney(invoice.outstandingBalance)}</span>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Line items</p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {invoice.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-700">{line.description}</span>
                  <span className="text-slate-500">
                    SAR {formatMoney(line.amount)} + {line.vatRate}% VAT
                  </span>
                </div>
              ))}
            </div>
          </div>

          {invoice.status === "POSTED" && (
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button variant="danger" size="sm" isLoading={isCancelling} onClick={handleCancel}>
                Cancel invoice (reversal)
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
