import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { auditLogApi } from "../../api/auditLog";
import { PageHeader } from "../../components/PageHeader";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { formatDateTime } from "../../lib/format";

const ACTION_TONE: Record<string, "blue" | "rose" | "green" | "amber" | "slate"> = {
  SALES_INVOICE_POSTED: "blue",
  SALES_INVOICE_CANCELLED: "rose",
  PURCHASE_INVOICE_POSTED: "amber",
  PURCHASE_INVOICE_CANCELLED: "rose",
  RECEIPT_POSTED: "green",
  PAYMENT_POSTED: "green",
  MANUAL_JOURNAL_POSTED: "slate",
  PERIOD_CLOSED: "rose",
};

export function AuditLogPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: logs, isLoading, error } = useApi(() => auditLogApi.list(companyId), [companyId]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Append-only record of every posting, cancellation, and period closure. Nothing here is ever edited or deleted."
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !logs || logs.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Timestamp</TH>
            </tr>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id}>
                <TD>
                  <Badge tone={ACTION_TONE[log.action] ?? "slate"}>{log.action.replace(/_/g, " ")}</Badge>
                </TD>
                <TD className="text-slate-500">
                  {log.entityType} <span className="font-mono text-xs text-slate-400">{log.entityId.slice(0, 8)}</span>
                </TD>
                <TD className="text-slate-500">{formatDateTime(log.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
