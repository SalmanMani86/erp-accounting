import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { journalEntriesApi } from "../../api/journalEntries";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { CreateManualJournalModal } from "./CreateManualJournalModal";
import { JournalEntryCard } from "./JournalEntryCard";

export function JournalEntriesPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: entries, isLoading, error, reload } = useApi(
    () => journalEntriesApi.list(companyId),
    [companyId]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        description="Every posted transaction in the system — from invoices, receipts, payments, reversals, and manual entries — appears here. Debits always equal credits."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New manual entry</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState title="No journal entries yet" />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {isCreateOpen && (
        <CreateManualJournalModal
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
