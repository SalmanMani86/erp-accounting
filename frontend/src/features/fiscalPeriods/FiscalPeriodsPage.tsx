import { useState } from "react";
import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { fiscalPeriodsApi } from "../../api/fiscalPeriods";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { formatDate } from "../../lib/format";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { CreatePeriodModal } from "./CreatePeriodModal";

export function FiscalPeriodsPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: periods, isLoading, error, reload } = useApi(() => fiscalPeriodsApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConfirmClose() {
    if (!confirmCloseId) return;
    const id = confirmCloseId;
    setClosingId(id);
    setActionError(null);
    try {
      await fiscalPeriodsApi.close(companyId, id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to close period");
    } finally {
      setClosingId(null);
      setConfirmCloseId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fiscal Periods"
        description="Postings are only accepted into an OPEN period. Closing a period blocks all further changes."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New period</Button>}
      />

      {actionError && <div className="mb-4"><ErrorBanner message={actionError} /></div>}

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !periods || periods.length === 0 ? (
        <EmptyState title="No fiscal periods yet" description="Create one to begin posting transactions." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Start date</TH>
              <TH>End date</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {periods.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-slate-900">{p.name}</TD>
                <TD>{formatDate(p.startDate)}</TD>
                <TD>{formatDate(p.endDate)}</TD>
                <TD>
                  <StatusBadge status={p.status} />
                </TD>
                <TD align="right">
                  {p.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={closingId === p.id}
                      onClick={() => setConfirmCloseId(p.id)}
                    >
                      Close period
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreatePeriodModal
          companyId={companyId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            reload();
          }}
        />
      )}

      {confirmCloseId && (
        <ConfirmDialog
          title="Close fiscal period"
          message="No further postings will be accepted into this period once it's closed. This cannot be undone from the UI."
          confirmLabel="Close period"
          variant="danger"
          isLoading={closingId === confirmCloseId}
          onConfirm={handleConfirmClose}
          onCancel={() => setConfirmCloseId(null)}
        />
      )}
    </div>
  );
}
