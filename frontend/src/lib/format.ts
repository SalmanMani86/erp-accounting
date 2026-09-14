export function formatMoney(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}
