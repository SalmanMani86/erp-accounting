import { useState } from "react";
import { fiscalPeriodsApi } from "../../api/fiscalPeriods";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Field, Input } from "../../components/Field";

export function CreatePeriodModal({
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
