import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | string;
  onChange: (val: number) => void;
  /** If true, shows "R$ " prefix */
  prefix?: boolean;
}

/**
 * A numeric input that:
 * - Shows empty string instead of "0" when focused and value is 0
 * - Accepts both comma and dot as decimal separator
 * - Uses type="text" with inputMode="decimal" for mobile compatibility
 */
export function CurrencyInput({ value, onChange, prefix, className, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num ? String(num).replace('.', ',') : '';
  });

  // Sync external value changes
  React.useEffect(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!document.activeElement || document.activeElement !== inputRef.current) {
      setDisplay(num ? String(num).replace('.', ',') : '');
    }
  }, [value]);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, one comma or dot, and minus
    const cleaned = raw.replace(/[^0-9,.\-]/g, '');
    setDisplay(cleaned);
    // Parse: convert comma to dot
    const parsed = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleFocus = () => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === 0) setDisplay('');
  };

  const handleBlur = () => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    setDisplay(num ? String(num).replace('.', ',') : '');
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(className)}
      {...props}
    />
  );
}

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | string;
  onChange: (val: number) => void;
  /** integer only */
  integer?: boolean;
}

/**
 * A numeric input for quantities that doesn't show "0" when focused
 */
export function NumberInput({ value, onChange, integer, className, ...props }: NumberInputProps) {
  const [display, setDisplay] = React.useState(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num ? String(num) : '';
  });

  React.useEffect(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    setDisplay(num ? String(num) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);
    const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleFocus = () => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num === 0) setDisplay('');
  };

  const handleBlur = () => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    setDisplay(num ? String(num) : '');
  };

  return (
    <Input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(className)}
      {...props}
    />
  );
}
