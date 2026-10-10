"use client";
import { useState } from "react";
import { Button } from "../ui/Button";
import { api, ApiError } from "@/lib/client/api";

export function PayButton({ number, token, label }: { number: string; token?: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="accent"
        size="lg"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await api<{ redirectUrl: string }>(`/orders/${number}/pay`, { method: "POST", body: { token } });
            window.location.href = r.redirectUrl;
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Ошибка");
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
