"use client";

import { type ReactNode } from "react";

type SelectProps = {
  label?: string;
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
};

export function Select({
  label,
  id,
  value,
  onChange,
  children,
  className = "",
  disabled,
  required,
  "aria-label": ariaLabel,
}: SelectProps) {
  const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
      >
        {children}
      </select>
    </div>
  );
}
