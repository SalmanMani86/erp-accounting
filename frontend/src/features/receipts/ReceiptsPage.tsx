import { useState } from "react";
import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { receiptsApi } from "../../api/receipts";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { formatDate, formatMoney } from "../../lib/format";
import { CreateReceiptModal } from "./CreateReceiptModal";

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
