import { useState } from "react";
import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { salesInvoicesApi } from "../../api/salesInvoices";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { formatDate, formatMoney } from "../../lib/format";
import { InvoiceDetailDrawer } from "./InvoiceDetailDrawer";
import { CreateSalesInvoiceModal } from "./CreateSalesInvoiceModal";

export function SalesInvoicesPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: invoices, isLoading, error, reload } = useApi(() => salesInvoicesApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        description="Posting an invoice immediately creates its balanced journal entry: Dr Accounts Receivable = Cr Revenue + Cr VAT Payable."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New sales invoice</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState title="No sales invoices yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Invoice #</TH>
              <TH>Customer</TH>
              <TH>Date</TH>
              <TH align="right">Total</TH>
              <TH align="center">Status</TH>
            </tr>
          </THead>
          <TBody>
            {invoices.map((inv) => (
              <TR key={inv.id} onClick={() => setSelectedId(inv.id)}>
                <TD className="font-medium text-slate-900">{inv.invoiceNumber}</TD>
                <TD className="text-slate-500">{inv.customer?.name ?? "—"}</TD>
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
        <CreateSalesInvoiceModal
          companyId={companyId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            reload();
          }}
        />
      )}

      {selectedId && (
        <InvoiceDetailDrawer
          companyId={companyId}
          invoiceId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
