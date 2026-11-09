export const BRAVO_BANK_FIRST_YEAR = 2015;
export const BRAVO_BANK_LAST_YEAR = 2026;

export function isSupportedBravoEditionYear(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= BRAVO_BANK_FIRST_YEAR && value <= BRAVO_BANK_LAST_YEAR;
}
