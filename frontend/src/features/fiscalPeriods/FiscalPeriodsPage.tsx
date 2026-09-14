import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { fiscalPeriodsApi } from "../../api/fiscalPeriods";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { StatusBadge } from "../../components/Badge";
import { formatDate } from "../../lib/format";
import { Modal } from "../../components/Modal";
import { Field, Input } from "../../components/Field";

export function FiscalPeriodsPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: periods, isLoading, error, reload } = useApi(() => fiscalPeriodsApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleClose(id: string) {
    if (!confirm("Close this fiscal period? No further postings will be accepted into it.")) return;
    setClosingId(id);
    setActionError(null);
    try {
      await fiscalPeriodsApi.close(companyId, id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to close period");
    } finally {
      setClosingId(null);
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
                      onClick={() => handleClose(p.id)}
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
    </div>
  );
}

function CreatePeriodModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await fiscalPeriodsApi.create(companyId, { name, startDate, endDate });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create fiscal period");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New fiscal period" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026-09" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date">
            <Input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create period
          </Button>
        </div>
      </form>
    </Modal>
  );
}
