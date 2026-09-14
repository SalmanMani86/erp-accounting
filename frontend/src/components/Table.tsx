import type { ReactNode } from "react";

const alignClasses = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

type Align = keyof typeof alignClasses;

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50">{children}</thead>;
}

export function TH({ children, align = "left" }: { children: ReactNode; align?: Align }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${alignClasses[align]}`}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TR({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr className={onClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: Align;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-slate-700 ${alignClasses[align]} ${className}`}>{children}</td>;
}
