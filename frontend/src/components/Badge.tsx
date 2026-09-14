type Tone = "green" | "amber" | "rose" | "slate" | "blue";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Tone> = {
    POSTED: "green",
    DRAFT: "amber",
    CANCELLED: "rose",
    OPEN: "green",
    CLOSED: "slate",
  };
  return <Badge tone={map[status] ?? "slate"}>{status}</Badge>;
}
