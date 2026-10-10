import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-muted/80 transition-colors focus:border-ink focus:outline-none focus:ring-0 disabled:bg-surface aria-[invalid=true]:border-danger";

export function Label({ children, htmlFor, required }: { children: ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-graphite">
      {children}
      {required && <span className="text-accent"> *</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-danger" role="alert">{children}</p>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...rest }, ref) {
  return <input ref={ref} className={`${control} h-12 ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", ...rest }, ref) {
  return <textarea ref={ref} className={`${control} min-h-[110px] py-3 ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", children, ...rest }, ref) {
  return (
    <select ref={ref} className={`${control} h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236B7380%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10 ${className}`} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({ label, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 text-[15px] text-graphite ${className}`}>
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-[var(--c-accent)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Field({ label, error, required, htmlFor, children, hint }: { label: string; error?: string; required?: boolean; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor} required={required}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
