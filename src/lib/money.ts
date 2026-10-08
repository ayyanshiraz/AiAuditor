/**
 * Money is handled internally as integer "cents" (minor units) to avoid
 * floating point rounding errors, which are unacceptable in an accounting
 * system. All amounts crossing the accounting engine boundary are converted
 * through these helpers.
 */

export function toCents(amount: number | string): number {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  // Round to avoid FP artifacts like 19.999999999998
  return Math.round(n * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function addCents(a: number, b: number): number {
  return a + b;
}

export function sumCents(values: (number | string)[]): number {
  return values.reduce<number>((acc, v) => acc + toCents(v), 0);
}

export function isZeroCents(cents: number): boolean {
  return cents === 0;
}

export function formatMoney(amount: number | string, currency = "PKR"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(n);
}
