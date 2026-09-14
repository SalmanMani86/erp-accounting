import { useCompany } from "../../context/CompanyContext";
import { useApi } from "../../lib/useApi";
import { reportsApi } from "../../api/reports";
import { salesInvoicesApi } from "../../api/salesInvoices";
import { fiscalPeriodsApi } from "../../api/fiscalPeriods";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { FullPageSpinner, ErrorBanner } from "../../components/Feedback";
import { formatMoney } from "../../lib/format";
import { StatusBadge } from "../../components/Badge";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany!.id;

  const trialBalance = useApi(() => reportsApi.trialBalance(companyId), [companyId]);
  const pnl = useApi(() => reportsApi.profitAndLoss(companyId), [companyId]);
  const balanceSheet = useApi(() => reportsApi.balanceSheet(companyId), [companyId]);
  const invoices = useApi(() => salesInvoicesApi.list(companyId), [companyId]);
  const periods = useApi(() => fiscalPeriodsApi.list(companyId), [companyId]);

  const isLoading = trialBalance.isLoading || pnl.isLoading || balanceSheet.isLoading || invoices.isLoading;
  const error = trialBalance.error || pnl.error || balanceSheet.error || invoices.error;

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorBanner message={error} />;

  const openPeriod = periods.data?.find((p) => p.status === "OPEN");
  const recentInvoices = [...(invoices.data ?? [])]
    .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`${currentCompany!.name}`}
        description={
          openPeriod
            ? `Current fiscal period: ${openPeriod.name} (open)`
            : "No open fiscal period — create one under Fiscal Periods to start posting."
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatMoney(pnl.data?.totalRevenue ?? 0)}
          tone="text-emerald-600"
        />
        <StatCard label="Net Income" value={formatMoney(pnl.data?.netIncome ?? 0)} tone="text-brand-600" />
        <StatCard label="Total Assets" value={formatMoney(balanceSheet.data?.totalAssets ?? 0)} tone="text-slate-900" />
        <StatCard
          label="Trial Balance"
          value={trialBalance.data?.isBalanced ? "Balanced" : "Out of balance"}
          tone={trialBalance.data?.isBalanced ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent sales invoices</h2>
          <Link to="/sales-invoices" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {recentInvoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No invoices posted yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to="/sales-invoices"
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">SAR {formatMoney(inv.totalAmount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-1.5 text-2xl font-semibold ${tone}`}>{value}</p>
      </CardBody>
    </Card>
  );
}
