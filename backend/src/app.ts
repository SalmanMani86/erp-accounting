import express from "express";
import cors from "cors";
import { companyRouter } from "./modules/company/company.routes";
import { fiscalPeriodRouter } from "./modules/fiscalPeriod/fiscalPeriod.routes";
import { chartOfAccountsRouter } from "./modules/chartOfAccounts/chartOfAccounts.routes";
import { customerRouter } from "./modules/customer/customer.routes";
import { supplierRouter } from "./modules/supplier/supplier.routes";
import { salesInvoiceRouter } from "./modules/salesInvoice/salesInvoice.routes";
import { purchaseInvoiceRouter } from "./modules/purchaseInvoice/purchaseInvoice.routes";
import { receiptRouter } from "./modules/receipt/receipt.routes";
import { paymentRouter } from "./modules/payment/payment.routes";
import { journalEntryRouter } from "./modules/journalEntry/journalEntry.routes";
import { reportsRouter, generalLedgerRouter } from "./modules/reports/reports.routes";
import { auditLogRouter } from "./modules/auditLog/auditLog.routes";
import { companyContext } from "./middleware/companyContext";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Top-level company creation/listing is not itself company-scoped.
  app.use("/api/companies", companyRouter);

  // Every other resource is nested under a resolved, validated :companyId,
  // enforced by companyContext BEFORE any of these routers run. This is the
  // server-side, query-level isolation boundary: req.companyId is threaded
  // into every downstream Prisma call from here on.
  const companyScoped = express.Router({ mergeParams: true });
  companyScoped.use("/fiscal-periods", fiscalPeriodRouter);
  companyScoped.use("/chart-of-accounts", chartOfAccountsRouter);
  companyScoped.use("/customers", customerRouter);
  companyScoped.use("/suppliers", supplierRouter);
  companyScoped.use("/sales-invoices", salesInvoiceRouter);
  companyScoped.use("/purchase-invoices", purchaseInvoiceRouter);
  companyScoped.use("/receipts", receiptRouter);
  companyScoped.use("/payments", paymentRouter);
  companyScoped.use("/journal-entries", journalEntryRouter);
  companyScoped.use("/general-ledger", generalLedgerRouter);
  companyScoped.use("/reports", reportsRouter);
  companyScoped.use("/audit-logs", auditLogRouter);

  app.use("/api/companies/:companyId", companyContext, companyScoped);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
