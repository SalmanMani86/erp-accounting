import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { reportsApi } from "../../api/reports";
import { PageHeader } from "../../components/PageHeader";
import { Table, THead, TH, TBody, TR, TD } from "../../components/Table";
import { FullPageSpinner, ErrorBanner } from "../../components/Feedback";
import { Card, CardBody } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { formatMoney } from "../../lib/format";

type Tab = "trial-balance" | "profit-and-loss" | "balance-sheet";

const TABS: { id: Tab; label: string }[] = [
  { id: "trial-balance", label: "Trial Balance" },
  { id: "profit-and-loss", label: "Profit & Loss" },
  { id: "balance-sheet", label: "Balance Sheet" },
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("trial-balance");

  return (
    <div>
      <PageHeader title="Reports" description="Computed live from posted journal entries — never a stored, cached figure." />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trial-balance" && <TrialBalanceTab />}
      {tab === "profit-and-loss" && <ProfitAndLossTab />}
      {tab === "balance-sheet" && <BalanceSheetTab />}
    </div>
  );
}

function TrialBalanceTab() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data, isLoading, error } = useApi(() => reportsApi.trialBalance(companyId), [companyId]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Badge tone={data.isBalanced ? "green" : "rose"}>{data.isBalanced ? "Balanced" : "Out of balance"}</Badge>
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Code</TH>
            <TH>Account</TH>
            <TH>Type</TH>
            <TH align="right">Debit</TH>
            <TH align="right">Credit</TH>
          </tr>
        </THead>
        <TBody>
          {data.rows.map((row) => (
            <TR key={row.accountId}>
              <TD className="font-mono text-xs text-slate-500">{row.code}</TD>
              <TD className="font-medium text-slate-900">{row.name}</TD>
              <TD className="text-slate-500">{row.type}</TD>
              <TD align="right">{Number(row.totalDebit) > 0 ? formatMoney(row.totalDebit) : ""}</TD>
              <TD align="right">{Number(row.totalCredit) > 0 ? formatMoney(row.totalCredit) : ""}</TD>
            </TR>
          ))}
        </TBody>
        <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-sm">
              Total
            </td>
            <td className="px-4 py-3 text-right text-sm">{formatMoney(data.totalDebit)}</td>
            <td className="px-4 py-3 text-right text-sm">{formatMoney(data.totalCredit)}</td>
          </tr>
        </tfoot>
      </Table>
    </div>
  );
}

function ProfitAndLossTab() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data, isLoading, error } = useApi(() => reportsApi.profitAndLoss(companyId), [companyId]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardBody>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue</p>
            <LineList lines={data.revenueLines} total={data.totalRevenue} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Expenses</p>
            <LineList lines={data.expenseLines} total={data.totalExpense} />
          </CardBody>
        </Card>
      </div>
      <Card className="h-fit">
        <CardBody>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net Income</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              Number(data.netIncome) >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            SAR {formatMoney(data.netIncome)}
          </p>
          <p className="mt-2 text-xs text-slate-400">Revenue minus expenses, VAT excluded.</p>
        </CardBody>
      </Card>
    </div>
  );
}

function BalanceSheetTab() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;
  const { data, isLoading, error } = useApi(() => reportsApi.balanceSheet(companyId), [companyId]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Badge tone={data.isBalanced ? "green" : "rose"}>
          {data.isBalanced ? "Assets = Liabilities + Equity" : "Out of balance"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Assets</p>
            <LineList lines={data.assetLines} total={data.totalAssets} />
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardBody>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Liabilities</p>
              <LineList lines={data.liabilityLines} total={data.totalLiabilities} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Equity</p>
              <LineList
                lines={[
                  ...data.equityLines,
                  { accountId: "net-income", code: "", name: "Current period net income", amount: data.currentPeriodNetIncome },
                ]}
                total={data.totalEquity}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LineList({
  lines,
  total,
}: {
  lines: { accountId: string; code: string; name: string; amount: string }[];
  total: string;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-slate-400">No activity</p>;
  }
  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.accountId} className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{line.name}</span>
          <span className="font-medium text-slate-800">SAR {formatMoney(line.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
        <span>Total</span>
        <span>SAR {formatMoney(total)}</span>
      </div>
    </div>
  );
}
