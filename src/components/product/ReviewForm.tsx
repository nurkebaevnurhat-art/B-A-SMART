"use client";
import { useState } from "react";
import { useShop } from "../ShopProvider";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { api, ApiError } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

export function ReviewForm({ productId }: { productId: string }) {
  const { t } = useI18n();
  const { user, openAccount } = useShop();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Button variant="outline" onClick={openAccount}>
        {t.product.writeReview}
      </Button>
    );
  }
  if (state === "done") return <p className="rounded-2xl bg-success/10 px-5 py-4 text-success">Спасибо! Отзыв появится после проверки модератором.</p>;

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        try {
          await api("/reviews", { method: "POST", body: { productId, rating, text } });
          setState("done");
        } catch (err) {
          setError(err instanceof ApiError ? err.message : t.common.error);
          setState("idle");
        }
      }}
    >
      <div className="flex gap-1" role="radiogroup" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-accent" : "text-line"}`} aria-label={`${n}`}>
            ★
          </button>
        ))}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Расскажите о товаре" aria-label="Текст отзыва" />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={state === "busy"}>{t.product.writeReview}</Button>
    </form>
  );
}
