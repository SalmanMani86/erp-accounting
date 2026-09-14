import { useState } from "react";
import { useCompany } from "../../context/useCompany";
import { useApi } from "../../lib/useApi";
import { customersApi } from "../../api/customers";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner, EmptyState } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input } from "../../components/Field";
import { formatMoney } from "../../lib/format";

export function CustomersPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data: customers, isLoading, error, reload } = useApi(() => customersApi.list(companyId), [companyId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Accounts Receivable is tracked per customer against posted, uncancelled sales invoices."
        actions={<Button onClick={() => setIsCreateOpen(true)}>New customer</Button>}
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !customers || customers.length === 0 ? (
        <EmptyState title="No customers yet" />
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
            {customers.map((c) => (
              <CustomerRow key={c.id} companyId={companyId} id={c.id} name={c.name} email={c.email} />
            ))}
          </TBody>
        </Table>
      )}

      {isCreateOpen && (
        <CreateCustomerModal
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

function CustomerRow({
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
  const { data: detail, isLoading } = useApi(() => customersApi.get(companyId, id), [companyId, id]);
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

function CreateCustomerModal({
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
      await customersApi.create(companyId, { name, email: email || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="New customer" onClose={onClose}>
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
            Create customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
