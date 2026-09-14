import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCompany } from "../context/useCompany";
import { FullPageSpinner, ErrorBanner } from "./Feedback";
import { CompanySwitcher } from "./CompanySwitcher";

const NAV_SECTIONS: { label: string; items: { to: string; label: string; icon: ReactElement }[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: <DashboardIcon /> }],
  },
  {
    label: "Setup",
    items: [
      { to: "/fiscal-periods", label: "Fiscal Periods", icon: <CalendarIcon /> },
      { to: "/chart-of-accounts", label: "Chart of Accounts", icon: <BookIcon /> },
      { to: "/customers", label: "Customers", icon: <UsersIcon /> },
      { to: "/suppliers", label: "Suppliers", icon: <TruckIcon /> },
    ],
  },
  {
    label: "Transactions",
    items: [
      { to: "/sales-invoices", label: "Sales Invoices", icon: <DocIcon /> },
      { to: "/receipts", label: "Receipts", icon: <InboxDownIcon /> },
      { to: "/purchase-invoices", label: "Purchase Invoices", icon: <DocIcon /> },
      { to: "/payments", label: "Payments", icon: <OutboxUpIcon /> },
      { to: "/journal-entries", label: "Journal Entries", icon: <JournalIcon /> },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports", label: "Reports", icon: <ChartIcon /> },
      { to: "/audit-log", label: "Audit Log", icon: <ShieldIcon /> },
    ],
  },
];

export function Layout() {
  const { isLoading, error, currentCompany } = useCompany();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            ER
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">ERP Accounting</p>
            <p className="text-xs text-slate-400">Assessment build</p>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <CompanySwitcher />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <span className="h-4 w-4 shrink-0">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          {isLoading ? (
            <FullPageSpinner />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : !currentCompany ? (
            <ErrorBanner message="No company selected. Create a company to get started." />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16V7a1 1 0 011-1h9v10M3 16a2 2 0 104 0M3 16h13m0-10h2.5l3.5 4v6h-2m-4 0a2 2 0 104 0m-4 0H9m8 0h2" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function InboxDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-5h10l4 5m-18 0v10a2 2 0 002 2h12a2 2 0 002-2V8m-18 0h18M12 11v5m0 0l-2-2m2 2l2-2" />
    </svg>
  );
}
function OutboxUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-5h10l4 5m-18 0v10a2 2 0 002 2h12a2 2 0 002-2V8m-18 0h18M12 16v-5m0 0l-2 2m2-2l2 2" />
    </svg>
  );
}
function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
