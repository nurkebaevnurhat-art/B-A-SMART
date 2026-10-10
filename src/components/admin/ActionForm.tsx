"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/server/admin/action";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Форма админки на серверном действии: показывает ошибки и уведомление об успехе */
export function ActionForm({
  action,
  children,
  className = "",
  submitLabel = "Сохранить",
  resetOnSuccess,
  confirm,
  hideSubmit,
  submitVariant = "primary",
  inline,
}: {
  action: Action;
  children?: React.ReactNode;
  className?: string;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  hideSubmit?: boolean;
  submitVariant?: "primary" | "accent" | "outline" | "danger" | "ghost";
  inline?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast({ tone: "ok", text: state.message ?? "Сохранено" });
      if (resetOnSuccess) ref.current?.reset();
      if (state.redirect) router.push(state.redirect);
    } else if (state.error) toast({ tone: "error", text: state.error });
  }, [state, toast, resetOnSuccess, router]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={inline ? `inline-flex items-center gap-2 ${className}` : className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && !inline && <p className="mt-3 rounded-xl bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{state.error}</p>}
      {!hideSubmit && <Submit label={submitLabel} variant={submitVariant} inline={inline} />}
    </form>
  );
}

export function Submit({ label, variant = "primary", inline }: { label: string; variant?: "primary" | "accent" | "outline" | "danger" | "ghost"; inline?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} loading={pending} className={inline ? "" : "mt-5"}>
      {label}
    </Button>
  );
}
