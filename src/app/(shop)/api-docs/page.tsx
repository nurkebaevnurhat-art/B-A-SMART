import type { Metadata } from "next";
import { API_OPERATIONS } from "@/server/openapi";

export const metadata: Metadata = { title: "API для разработчиков", description: "REST API B&A SMART /api/v1 для мобильных приложений и интеграций." };

const METHOD: Record<string, string> = { get: "bg-success/10 text-success", post: "bg-primary/10 text-primary", patch: "bg-accent/10 text-accent-dark", delete: "bg-danger/10 text-danger" };

export default function ApiDocs() {
  const rows = Object.entries(API_OPERATIONS).flatMap(([path, m]) => Object.entries(m).map(([method, op]) => ({ path, method, ...op })));
  const tags = [...new Set(rows.map((r) => r.tag))];
  return (
    <div className="container max-w-5xl pb-20 pt-10">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">REST API /api/v1</h1>
      <p className="mt-4 max-w-3xl text-graphite">
        Общий API для сайта и будущих приложений Android/iOS. Ответ: <code className="rounded bg-surface px-1">{"{ data }"}</code> или{" "}
        <code className="rounded bg-surface px-1">{"{ error: { code, message } }"}</code>. Цены — целые тенге. Авторизация: cookie на сайте или{" "}
        <code className="rounded bg-surface px-1">Authorization: Bearer &lt;token&gt;</code> в приложении; корзина гостя — заголовок <code className="rounded bg-surface px-1">X-Cart-Token</code>.
      </p>
      <p className="mt-3">
        Спецификация OpenAPI 3.1: <a href="/api/v1/openapi.json" className="link font-medium">/api/v1/openapi.json</a> — импортируется в Swagger UI, Postman или генератор клиента.
      </p>
      {tags.map((tag) => (
        <section key={tag} className="mt-10">
          <h2 className="font-sans text-xl font-semibold">{tag}</h2>
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {rows.filter((r) => r.tag === tag).map((r) => (
              <li key={r.method + r.path} className="flex flex-wrap items-start gap-3 p-4">
                <span className={`w-16 rounded-md py-0.5 text-center font-mono text-xs font-semibold uppercase ${METHOD[r.method]}`}>{r.method}</span>
                <code className="font-mono text-sm">{r.path}</code>
                <span className="basis-full text-sm text-graphite md:ml-auto md:basis-auto md:text-right">
                  {r.summary}
                  {r.auth === "user" && <span className="ml-2 text-xs text-accent-dark">требует вход</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
