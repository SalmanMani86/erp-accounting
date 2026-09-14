export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type InvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type SettlementStatus = "POSTED" | "CANCELLED";
export type FiscalPeriodStatus = "OPEN" | "CLOSED";

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface FiscalPeriod {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  closedAt: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  createdAt: string;
  outstandingBalance?: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  createdAt: string;
  outstandingBalance?: string;
}

export interface SalesInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  revenueAccountId: string;
  amount: string;
  vatRate: string;
  vatAmount: string;
}

export interface SalesInvoice {
  id: string;
  companyId: string;
  customerId: string;
  fiscalPeriodId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  journalEntryId: string | null;
  createdAt: string;
  lines: SalesInvoiceLine[];
  customer?: Customer;
  outstandingBalance?: string;
}

export interface PurchaseInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  expenseAccountId: string;
  amount: string;
  vatRate: string;
  vatAmount: string;
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  supplierId: string;
  fiscalPeriodId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  journalEntryId: string | null;
  createdAt: string;
  lines: PurchaseInvoiceLine[];
  supplier?: Supplier;
  outstandingBalance?: string;
}

export interface ReceiptAllocation {
  id: string;
  receiptId: string;
  invoiceId: string;
  allocatedAmount: string;
}

export interface Receipt {
  id: string;
  companyId: string;
  customerId: string;
  fiscalPeriodId: string;
  receiptDate: string;
  amount: string;
  bankAccountId: string;
  status: SettlementStatus;
  journalEntryId: string | null;
  createdAt: string;
  allocations: ReceiptAllocation[];
  customer?: Customer;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: string;
}

export interface Payment {
  id: string;
  companyId: string;
  supplierId: string;
  fiscalPeriodId: string;
  paymentDate: string;
  amount: string;
  bankAccountId: string;
  status: SettlementStatus;
  journalEntryId: string | null;
  createdAt: string;
  allocations: PaymentAllocation[];
  supplier?: Supplier;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: string;
  credit: string;
  lineOrder: number;
  account?: Account;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  fiscalPeriodId: string;
  entryDate: string;
  sourceType: "SALES_INVOICE" | "PURCHASE_INVOICE" | "RECEIPT" | "PAYMENT" | "MANUAL" | "REVERSAL";
  sourceId: string | null;
  reversalOfId: string | null;
  description: string | null;
  createdAt: string;
  lines: JournalEntryLine[];
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  totalDebit: string;
  totalCredit: string;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
}

export interface ProfitAndLossLine {
  accountId: string;
  code: string;
  name: string;
  amount: string;
}

export interface ProfitAndLoss {
  revenueLines: ProfitAndLossLine[];
  expenseLines: ProfitAndLossLine[];
  totalRevenue: string;
  totalExpense: string;
  netIncome: string;
}

export interface BalanceSheetLine {
  accountId: string;
  code: string;
  name: string;
  amount: string;
}

export interface BalanceSheet {
  assetLines: BalanceSheetLine[];
  liabilityLines: BalanceSheetLine[];
  equityLines: BalanceSheetLine[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  currentPeriodNetIncome: string;
  isBalanced: boolean;
}

export interface AccountLedgerEntry {
  journalEntryId: string;
  entryDate: string;
  sourceType: string;
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface AccountLedger {
  account: Account;
  entries: AccountLedgerEntry[];
}

export interface AuditLogEntry {
  id: string;
  companyId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}
