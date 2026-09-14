import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { chartOfAccountsApi } from "../../api/chartOfAccounts";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, Input, Select } from "../../components/Field";
import type { AccountType } from "../../types";

const TYPE_TONE: Record<AccountType, "blue" | "rose" | "amber" | "green" | "slate"> = {
  ASSET: "blue",
  LIABILITY: "rose",
  EQUITY: "amber",
  REVENUE: "green",
  EXPENSE: "slate",
};

export function ChartOfAccountsPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: accounts, isLoading, error, reload } = useApi(
    () => chartOfAccountsApi.list(companyId),
    [companyId]
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description="Every journal line posts against one of these accounts. Type determines whether it carries a normal debit or credit balance."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New account</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState title="No accounts yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH align="center">Status</TH>
            </tr>
          </THead>
          <TBody>
            {accounts.map((a) => (
              <TR key={a.id}>
                <TD className="font-mono text-xs text-slate-500">{a.code}</TD>
                <TD className="font-medium text-slate-900">{a.name}</TD>
                <TD>
                  <Badge tone={TYPE_TONE[a.type]}>{a.type}</Badge>
                </TD>
                <TD align="center">
                  <Badge tone={a.isActive ? "green" : "slate"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreateAccountModal
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

function CreateAccountModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("ASSET");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await chartOfAccountsApi.create(companyId, { code, name, type });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code">
            <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 6000" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expense</option>
            </Select>
          </Field>
        </div>
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fuel Expense" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
