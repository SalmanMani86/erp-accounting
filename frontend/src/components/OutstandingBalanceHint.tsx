import { formatMoney } from "../lib/format";

export function OutstandingBalanceBanner({ amount }: { amount: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
      Outstanding balance: <span className="font-medium text-slate-900">SAR {formatMoney(amount)}</span>
    </div>
  );
}

export function ExceedsBalanceWarning({ limit }: { limit: number }) {
  return (
    <span className="mt-1 block text-xs text-rose-600">
      Cannot exceed outstanding balance of SAR {formatMoney(limit)}
    </span>
  );
}
