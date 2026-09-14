import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { suppliersApi } from "../../api/suppliers";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input } from "../../components/Field";
import { formatMoney } from "../../lib/format";

export function SuppliersPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: suppliers, isLoading, error, reload } = useApi(() => suppliersApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Accounts Payable is tracked per supplier against posted, uncancelled purchase invoices."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New supplier</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !suppliers || suppliers.length === 0 ? (
        <EmptyState title="No suppliers yet" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH align="right">Outstanding balance</TH>
            </tr>
          </THead>
          <TBody>
            {suppliers.map((s) => (
              <SupplierRow key={s.id} companyId={companyId} id={s.id} name={s.name} email={s.email} />
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreateSupplierModal
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

function SupplierRow({
  companyId,
  id,
  name,
  email,
}: {
  companyId: string;
  id: string;
  name: string;
  email: string | null;
}) {
  const { data: detail, isLoading } = useApi(() => suppliersApi.get(companyId, id), [companyId, id]);
  return (
    <TR>
      <TD className="font-medium text-slate-900">{name}</TD>
      <TD className="text-slate-500">{email ?? "—"}</TD>
      <TD align="right" className="font-medium text-slate-700">
        {isLoading ? "…" : `SAR ${formatMoney(detail?.outstandingBalance ?? "0")}`}
      </TD>
    </TR>
  );
}

function CreateSupplierModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await suppliersApi.create(companyId, { name, email: email || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New supplier" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email (optional)">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create supplier
          </Button>
        </div>
      </form>
    </Modal>
  );
}
