"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="mt-2 text-graphite">Мы уже знаем о проблеме. Попробуйте обновить страницу.</p>
      {error.digest && <p className="mt-1 text-xs text-muted">Код: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Повторить</Button>
    </div>
  );
}
