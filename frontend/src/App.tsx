import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CompanyProvider } from "./context/CompanyContext";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { FiscalPeriodsPage } from "./features/fiscalPeriods/FiscalPeriodsPage";
import { ChartOfAccountsPage } from "./features/chartOfAccounts/ChartOfAccountsPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { SuppliersPage } from "./features/suppliers/SuppliersPage";
import { SalesInvoicesPage } from "./features/salesInvoices/SalesInvoicesPage";
import { PurchaseInvoicesPage } from "./features/purchaseInvoices/PurchaseInvoicesPage";
import { ReceiptsPage } from "./features/receipts/ReceiptsPage";
import { PaymentsPage } from "./features/payments/PaymentsPage";
import { JournalEntriesPage } from "./features/journalEntries/JournalEntriesPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { AuditLogPage } from "./features/auditLog/AuditLogPage";

export default function App() {
  return (
    <BrowserRouter>
      <CompanyProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fiscal-periods" element={<FiscalPeriodsPage />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
            <Route path="/purchase-invoices" element={<PurchaseInvoicesPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/journal-entries" element={<JournalEntriesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>
        </Routes>
      </CompanyProvider>
    </BrowserRouter>
  );
}
