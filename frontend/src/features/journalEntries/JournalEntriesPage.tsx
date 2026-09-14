import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { journalEntriesApi } from "../../api/journalEntries";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { formatDate, formatMoney } from "../../lib/format";
import { CreateManualJournalModal } from "./CreateManualJournalModal";

const SOURCE_TONE: Record<string, "blue" | "green" | "amber" | "slate" | "rose"> = {
  SALES_INVOICE: "blue",
  PURCHASE_INVOICE: "amber",
  RECEIPT: "green",
  PAYMENT: "green",
  MANUAL: "slate",
  REVERSAL: "rose",
};

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
          {entries.map((entry) => {
            const totalDebit = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
            return (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Badge tone={SOURCE_TONE[entry.sourceType] ?? "slate"}>{entry.sourceType.replace("_", " ")}</Badge>
                    <span className="text-sm text-slate-600">{entry.description ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatDate(entry.entryDate)}</span>
                    <span className="font-medium text-slate-600">SAR {formatMoney(totalDebit)}</span>
                  </div>
                </div>
                <Table>
                  <THead>
                    <tr>
                      <TH>Account</TH>
                      <TH align="right">Debit</TH>
                      <TH align="right">Credit</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {entry.lines.map((line) => (
                      <TR key={line.id}>
                        <TD className="text-slate-600">
                          {line.account ? `${line.account.code} · ${line.account.name}` : line.accountId}
                        </TD>
                        <TD align="right">{Number(line.debit) > 0 ? formatMoney(line.debit) : ""}</TD>
                        <TD align="right">{Number(line.credit) > 0 ? formatMoney(line.credit) : ""}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            );
          })}
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
