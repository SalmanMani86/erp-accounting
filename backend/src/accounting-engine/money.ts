import { Decimal } from "@prisma/client/runtime/library";

export type MoneyInput = Decimal | number | string;

export function toMoney(value: MoneyInput): Decimal {
  return new Decimal(value).toDecimalPlaces(2);
}

export const ZERO = new Decimal(0);

export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0));
}

export function isEqual(a: Decimal, b: Decimal): boolean {
  return a.toDecimalPlaces(2).equals(b.toDecimalPlaces(2));
}
