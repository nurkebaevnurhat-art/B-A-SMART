"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/** Выезжающая панель (справа/слева) или модальное окно (center). Закрывается по Esc и клику по фону. */
export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
  width = "max-w-[440px]",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: "right" | "left" | "center";
  children: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    setTimeout(() => panel.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const pos =
    side === "center"
      ? "inset-x-4 top-1/2 -translate-y-1/2 mx-auto rounded-3xl max-h-[90vh] animate-fade-up"
      : `inset-y-0 ${side === "right" ? "right-0 animate-slide-in" : "left-0 animate-fade-up"} w-full`;
  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[fade-up_.2s_ease_both]" onClick={onClose} />
      <div ref={panel} tabIndex={-1} className={`absolute ${pos} ${width} flex flex-col overflow-hidden bg-white shadow-lift outline-none`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div className="font-display text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-graphite hover:bg-surface" aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
