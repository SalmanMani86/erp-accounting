import { Decimal } from "@prisma/client/runtime/library";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface AccountRef {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export interface JournalLineDraft {
  accountId: string;
  debit: Decimal;
  credit: Decimal;
}

export interface JournalEntryDraft {
  entryDate: Date;
  sourceType: "SALES_INVOICE" | "PURCHASE_INVOICE" | "RECEIPT" | "PAYMENT" | "MANUAL" | "REVERSAL";
  sourceId?: string;
  reversalOfId?: string;
  description?: string;
  lines: JournalLineDraft[];
}
