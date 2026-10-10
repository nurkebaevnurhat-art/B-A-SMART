import type { ReactNode } from "react";

type Tone = "accent" | "ink" | "primary" | "muted" | "success" | "danger" | "outline";
const tones: Record<Tone, string> = {
  accent: "bg-accent text-white",
  ink: "bg-ink text-white",
  primary: "bg-primary text-white",
  muted: "bg-surface text-graphite",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  outline: "border border-line text-graphite bg-white",
};

export function Badge({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium tracking-wide ${tones[tone]} ${className}`}>{children}</span>;
}
