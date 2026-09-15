import express from "express";
import { companyRouter } from "../modules/company/company.routes";
import { fiscalPeriodRouter } from "../modules/fiscalPeriod/fiscalPeriod.routes";
import { chartOfAccountsRouter } from "../modules/chartOfAccounts/chartOfAccounts.routes";
import { customerRouter } from "../modules/customer/customer.routes";
import { supplierRouter } from "../modules/supplier/supplier.routes";
import { salesInvoiceRouter } from "../modules/salesInvoice/salesInvoice.routes";
import { purchaseInvoiceRouter } from "../modules/purchaseInvoice/purchaseInvoice.routes";
import { receiptRouter } from "../modules/receipt/receipt.routes";
import { paymentRouter } from "../modules/payment/payment.routes";
import { journalEntryRouter } from "../modules/journalEntry/journalEntry.routes";
import { reportsRouter, generalLedgerRouter } from "../modules/reports/reports.routes";
import { auditLogRouter } from "../modules/auditLog/auditLog.routes";
import { companyContext } from "../middleware/companyContext";

/**
 * Every resource nested under a resolved, validated :companyId, enforced by
 * companyContext BEFORE any of these routers run. This is the server-side,
 * query-level isolation boundary: req.companyId is threaded into every
 * downstream Prisma call from here on.
 */
const companyScopedRouter = express.Router({ mergeParams: true });
companyScopedRouter.use("/fiscal-periods", fiscalPeriodRouter);
companyScopedRouter.use("/chart-of-accounts", chartOfAccountsRouter);
companyScopedRouter.use("/customers", customerRouter);
companyScopedRouter.use("/suppliers", supplierRouter);
companyScopedRouter.use("/sales-invoices", salesInvoiceRouter);
companyScopedRouter.use("/purchase-invoices", purchaseInvoiceRouter);
companyScopedRouter.use("/receipts", receiptRouter);
companyScopedRouter.use("/payments", paymentRouter);
companyScopedRouter.use("/journal-entries", journalEntryRouter);
companyScopedRouter.use("/general-ledger", generalLedgerRouter);
companyScopedRouter.use("/reports", reportsRouter);
companyScopedRouter.use("/audit-logs", auditLogRouter);

export const apiRouter = express.Router();

// Top-level company creation/listing is not itself company-scoped.
apiRouter.use("/companies", companyRouter);
apiRouter.use("/companies/:companyId", companyContext, companyScopedRouter);
