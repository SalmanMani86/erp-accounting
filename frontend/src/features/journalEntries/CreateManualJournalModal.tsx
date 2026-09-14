import { useState } from "react";
import { useApi } from "../../lib/useApi";
import { journalEntriesApi } from "../../api/journalEntries";
import { chartOfAccountsApi } from "../../api/chartOfAccounts";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import { formatMoney } from "../../lib/format";

interface LineDraft {
  accountCode: string;
  debit: string;
  credit: string;
}

export function CreateManualJournalModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: accounts } = useApi(() => chartOfAccountsApi.list(companyId), [companyId]);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { accountCode: "", debit: "", credit: "" },
    { accountCode: "", debit: "", credit: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { accountCode: "", debit: "", credit: "" }]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await journalEntriesApi.create(companyId, {
        entryDate,
        description: description || undefined,
        lines: lines
          .filter((l) => l.accountCode)
          .map((l) => ({
            accountCode: l.accountCode,
            debit: l.debit ? Number(l.debit) : undefined,
            credit: l.credit ? Number(l.credit) : undefined,
          })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post journal entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New manual journal entry" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry date">
            <Input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </Field>
          <Field label="Description (optional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Lines</span>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>
              Add line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 p-2.5">
                <div className="col-span-6">
                  <Field label="Account">
                    <Select
                      required
                      value={line.accountCode}
                      onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                    >
                      <option value="">Select account</option>
                      {accounts?.map((a) => (
                        <option key={a.id} value={a.code}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Debit">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Credit">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                    />
                  </Field>
                </div>
                <div className="col-span-2 flex justify-end pb-1">
                  {lines.length > 2 && (
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

        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
            isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <span>
            Debit {formatMoney(totalDebit)} · Credit {formatMoney(totalCredit)}
          </span>
          <span className="font-medium">{isBalanced ? "Balanced" : "Not balanced"}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!isBalanced}>
            Post entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
