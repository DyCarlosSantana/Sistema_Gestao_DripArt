import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseInputNumber(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Replace comma with dot, remove anything that is not digit, dot or minus
  const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
  return isNaN(parsed) ? 0 : parsed;
}
