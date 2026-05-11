import { Input } from "@/components/ui/input";
import { parseInputNumber } from "@/lib/utils";

interface MoneyInputProps {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A text input for monetary values that:
 * - Shows empty instead of "0" when the field is pristine
 * - Accepts comma as decimal separator (Brazilian format)
 * - Uses inputMode="decimal" for mobile numeric keyboard
 */
export function MoneyInput({ value, onChange, placeholder = "0,00", className, disabled }: MoneyInputProps) {
  const display = value === 0 || value === "0" || value === "" || value === undefined || value === null
    ? ""
    : String(value);

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      value={display}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
