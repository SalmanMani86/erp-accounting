import { useState } from "react";
import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { paymentsApi } from "../../api/payments";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { formatDate, formatMoney } from "../../lib/format";
import { CreatePaymentModal } from "./CreatePaymentModal";

export function PaymentsPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: payments, isLoading, error, reload } = useApi(() => paymentsApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="A payment posts Dr Accounts Payable = Cr Cash/Bank and settles against one or more purchase invoices."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New payment</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !payments || payments.length === 0 ? (
        <EmptyState title="No payments yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Supplier</TH>
              <TH>Date</TH>
              <TH align="right">Amount</TH>
              <TH>Allocated to</TH>
              <TH align="center">Status</TH>
            </tr>
          </THead>
          <TBody>
            {payments.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-slate-900">{p.supplier?.name ?? "—"}</TD>
                <TD>{formatDate(p.paymentDate)}</TD>
                <TD align="right" className="font-medium">
                  SAR {formatMoney(p.amount)}
                </TD>
                <TD className="text-slate-500">{p.allocations.length} invoice(s)</TD>
                <TD align="center">
                  <StatusBadge status={p.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreatePaymentModal
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
