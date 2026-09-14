export class UnbalancedEntryError extends Error {
  constructor(totalDebit: string, totalCredit: string) {
    super(`Journal entry is not balanced: total debit ${totalDebit} != total credit ${totalCredit}`);
    this.name = "UnbalancedEntryError";
  }
}

export class InvalidJournalLineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJournalLineError";
  }
}
