"use client";
import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "./Field";

/** Маска +7 (XXX) XXX-XX-XX */
export function maskPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  // Убираем код страны только если он действительно введён: «+7…» или полный номер из 11 цифр (8/7…)
  if (raw.trim().startsWith("+7")) d = d.slice(1);
  else if (d.length === 11 && (d.startsWith("8") || d.startsWith("7"))) d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return "";
  let s = "+7 (" + d.slice(0, 3);
  if (d.length >= 3) s += ")";
  if (d.length > 3) s += " " + d.slice(3, 6);
  if (d.length > 6) s += "-" + d.slice(6, 8);
  if (d.length > 8) s += "-" + d.slice(8, 10);
  return s;
}

export const PhoneInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (v: string) => void }>(
  function PhoneInput({ value, onChange, ...rest }, ref) {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+7 (___) ___-__-__"
        value={value}
        onChange={(e) => onChange(maskPhone(e.target.value))}
        {...rest}
      />
    );
  },
);
