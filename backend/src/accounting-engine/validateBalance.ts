import { Decimal } from "@prisma/client/runtime/library";
import { JournalLineDraft } from "./types";
import { InvalidJournalLineError, UnbalancedEntryError } from "./errors";
import { sum, ZERO } from "./money";

/**
 * Enforces the core double-entry invariant: total debits must equal total
 * credits, there must be at least two lines, and no single line may carry
 * both a debit and a credit.
 */
export function validateBalancedLines(lines: JournalLineDraft[]): void {
  if (lines.length < 2) {
    throw new InvalidJournalLineError("A journal entry must have at least two lines");
  }

  for (const line of lines) {
    if (line.debit.lessThan(ZERO) || line.credit.lessThan(ZERO)) {
      throw new InvalidJournalLineError("Journal line amounts cannot be negative");
    }
    if (line.debit.greaterThan(ZERO) && line.credit.greaterThan(ZERO)) {
      throw new InvalidJournalLineError("A journal line cannot have both a debit and a credit");
    }
    if (line.debit.equals(ZERO) && line.credit.equals(ZERO)) {
      throw new InvalidJournalLineError("A journal line must have a nonzero debit or credit");
    }
  }

  const totalDebit: Decimal = sum(lines.map((l) => l.debit));
  const totalCredit: Decimal = sum(lines.map((l) => l.credit));

  if (!totalDebit.equals(totalCredit)) {
    throw new UnbalancedEntryError(totalDebit.toFixed(2), totalCredit.toFixed(2));
  }
}
