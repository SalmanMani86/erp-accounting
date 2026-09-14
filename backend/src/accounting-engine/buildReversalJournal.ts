import { JournalLineDraft } from "./types";
import { validateBalancedLines } from "./validateBalance";

/**
 * Builds the mirror-image lines for reversing a posted journal entry:
 * every debit becomes a credit and vice versa, on the same accounts.
 * Net GL impact of (original + reversal) is always zero.
 */
export function buildReversalLines(originalLines: JournalLineDraft[]): JournalLineDraft[] {
  const reversed: JournalLineDraft[] = originalLines.map((line) => ({
    accountId: line.accountId,
    debit: line.credit,
    credit: line.debit,
  }));

  validateBalancedLines(reversed);
  return reversed;
}
