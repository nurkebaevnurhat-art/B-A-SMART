"use client";
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-white p-8">
      <h1 className="text-xl font-semibold">Ошибка</h1>
      <p className="mt-2 text-sm text-graphite">{error.message || "Не удалось загрузить раздел."}</p>
      <button onClick={reset} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm text-white">Повторить</button>
    </div>
  );
}
