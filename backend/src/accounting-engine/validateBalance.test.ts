import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { validateBalancedLines } from "./validateBalance";
import { UnbalancedEntryError, InvalidJournalLineError } from "./errors";

const acct = (id: string) => id;

describe("validateBalancedLines", () => {
  it("accepts a balanced two-line entry", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(100), credit: new Decimal(0) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(100) },
      ])
    ).not.toThrow();
  });

  it("rejects an unbalanced entry", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(100), credit: new Decimal(0) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(99) },
      ])
    ).toThrow(UnbalancedEntryError);
  });

  it("rejects fewer than two lines", () => {
    expect(() =>
      validateBalancedLines([{ accountId: acct("ar"), debit: new Decimal(100), credit: new Decimal(0) }])
    ).toThrow(InvalidJournalLineError);
  });

  it("rejects a line with both debit and credit set", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(100), credit: new Decimal(50) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(50) },
      ])
    ).toThrow(InvalidJournalLineError);
  });

  it("rejects a line with neither debit nor credit", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(0), credit: new Decimal(0) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(100) },
      ])
    ).toThrow(InvalidJournalLineError);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(-10), credit: new Decimal(0) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(-10) },
      ])
    ).toThrow(InvalidJournalLineError);
  });

  it("accepts a multi-line entry that balances across more than two lines", () => {
    expect(() =>
      validateBalancedLines([
        { accountId: acct("ar"), debit: new Decimal(115), credit: new Decimal(0) },
        { accountId: acct("rev"), debit: new Decimal(0), credit: new Decimal(100) },
        { accountId: acct("vat"), debit: new Decimal(0), credit: new Decimal(15) },
      ])
    ).not.toThrow();
  });
});
