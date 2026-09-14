import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { computeTrialBalance, netBalance, AccountAggregate, outstandingInvoiceBalance } from "./reports";

describe("reports", () => {
  it("netBalance treats ASSET/EXPENSE as debit-normal and LIABILITY/EQUITY/REVENUE as credit-normal", () => {
    const asset: AccountAggregate = {
      account: { id: "a", code: "1000", name: "Cash", type: "ASSET" },
      totalDebit: new Decimal(100),
      totalCredit: new Decimal(30),
    };
    expect(netBalance(asset).toFixed(2)).toBe("70.00");

    const liability: AccountAggregate = {
      account: { id: "b", code: "2000", name: "VAT Payable", type: "LIABILITY" },
      totalDebit: new Decimal(10),
      totalCredit: new Decimal(50),
    };
    expect(netBalance(liability).toFixed(2)).toBe("40.00");
  });

  it("trial balance flags an unbalanced GL as not balanced", () => {
    const aggregates: AccountAggregate[] = [
      {
        account: { id: "a", code: "1000", name: "Cash", type: "ASSET" },
        totalDebit: new Decimal(100),
        totalCredit: new Decimal(0),
      },
      {
        account: { id: "b", code: "4000", name: "Revenue", type: "REVENUE" },
        totalDebit: new Decimal(0),
        totalCredit: new Decimal(90),
      },
    ];
    const tb = computeTrialBalance(aggregates);
    expect(tb.isBalanced).toBe(false);
  });

  it("outstandingInvoiceBalance handles zero allocations", () => {
    const remaining = outstandingInvoiceBalance(new Decimal(11500), []);
    expect(remaining.toFixed(2)).toBe("11500.00");
  });

  it("outstandingInvoiceBalance handles multiple partial allocations", () => {
    const remaining = outstandingInvoiceBalance(new Decimal(11500), [new Decimal(5000), new Decimal(3000)]);
    expect(remaining.toFixed(2)).toBe("3500.00");
  });
});
