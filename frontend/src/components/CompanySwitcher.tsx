import { useState } from "react";
import { useCompany } from "../context/CompanyContext";
import { Modal } from "./Modal";
import { Field, Input } from "./Field";
import { Button } from "./Button";
import { companiesApi } from "../api/companies";
import { ErrorBanner } from "./Feedback";

export function CompanySwitcher() {
  const { companies, currentCompany, selectCompany, refreshCompanies } = useCompany();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Company</label>
      <div className="flex items-center gap-1.5">
        <select
          className="w-full truncate rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          value={currentCompany?.id ?? ""}
          onChange={(e) => selectCompany(e.target.value)}
        >
          {companies.length === 0 && <option value="">No companies</option>}
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsCreateOpen(true)}
          title="Create company"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {isCreateOpen && (
        <CreateCompanyModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={async (id) => {
            await refreshCompanies();
            selectCompany(id);
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const company = await companiesApi.create({ name, seedDefaultChartOfAccounts: true });
      onCreated(company.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Create company" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Company name">
          <Input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Demo Transport Co."
          />
        </Field>
        <p className="text-xs text-slate-400">
          A standard Chart of Accounts (Cash, AR, AP, VAT, Revenue, Expense) is created automatically.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create company
          </Button>
        </div>
      </form>
    </Modal>
  );
}
