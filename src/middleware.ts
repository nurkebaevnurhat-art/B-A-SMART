import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. Защита от CSRF: изменяющие запросы к API с cookie-сессией должны приходить с того же Origin.
 *    Запросы мобильного приложения (Authorization: Bearer) и вебхуки провайдеров не проверяются.
 * 2. Быстрый редирект неавторизованных из /admin (права всё равно проверяются на сервере).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const isWebhook = pathname.startsWith("/api/v1/payments/webhook/");
    const bearer = req.headers.get("authorization")?.startsWith("Bearer ");
    if (!isWebhook && !bearer) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      if (origin && host && new URL(origin).host !== host) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Недопустимый источник запроса" } }, { status: 403 });
      }
    }
  }
  if (pathname.startsWith("/admin") && !req.cookies.get("ba_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/admin/:path*"] };
