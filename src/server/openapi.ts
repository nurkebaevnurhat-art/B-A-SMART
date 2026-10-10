/**
 * OpenAPI 3.1 описание REST API /api/v1.
 * Используется веб-сайтом и будущим мобильным приложением (React Native / Expo).
 */
type Op = {
  tag: string;
  summary: string;
  description?: string;
  auth?: "user" | "optional" | "none";
  params?: { name: string; in: "query" | "path" | "header"; required?: boolean; description?: string; schema?: object }[];
  body?: object;
  response?: object;
};

const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const str = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const arr = (items: object) => ({ type: "array", items });
const obj = (properties: Record<string, object>, required: string[] = []) => ({ type: "object", properties, required });

const CART_HEADER = { name: "X-Cart-Token", in: "header" as const, description: "Токен корзины для мобильного приложения (возвращается в ответе /cart как token). На сайте используется cookie." };

const ops: Record<string, Record<string, Op>> = {
  "/catalog": {
    get: {
      tag: "Каталог",
      summary: "Список товаров с фильтрами",
      description: "Новые и восстановленные товары — карточка на модель; б/у — карточка на каждый экземпляр.",
      params: [
        { name: "category", in: "query", description: "slug категории, 'accessories' или 'all'" },
        { name: "q", in: "query", description: "Поиск по названию и модели" },
        { name: "brand", in: "query", description: "slug брендов через запятую" },
        { name: "condition", in: "query", description: "NEW,USED,REFURBISHED через запятую" },
        { name: "grade", in: "query", description: "EXCELLENT,GOOD,FAIR (для б/у)" },
        { name: "storage", in: "query", description: "Память в ГБ через запятую" },
        { name: "color", in: "query", description: "Цвета через запятую" },
        { name: "compat", in: "query", description: "Ключ модели для совместимых аксессуаров, например iphone-16" },
        { name: "priceMin", in: "query", schema: int },
        { name: "priceMax", in: "query", schema: int },
        { name: "inStock", in: "query", schema: bool },
        { name: "installment", in: "query", schema: bool },
        { name: "sort", in: "query", schema: { type: "string", enum: ["new", "price_asc", "price_desc", "popular"] } },
        { name: "page", in: "query", schema: int },
        { name: "perPage", in: "query", schema: int },
      ],
      response: obj({ items: arr(ref("OfferCard")), total: int, page: int, pages: int, perPage: int }),
    },
  },
  "/catalog/facets": { get: { tag: "Каталог", summary: "Значения фильтров (бренды, память, цвета, цены, совместимость)", params: [{ name: "category", in: "query" }, { name: "condition", in: "query" }, { name: "q", in: "query" }] } },
  "/categories": { get: { tag: "Каталог", summary: "Категории и бренды" } },
  "/search": { get: { tag: "Каталог", summary: "Подсказки поиска", params: [{ name: "q", in: "query", required: true }], response: arr(ref("OfferCard")) } },
  "/cards": { post: { tag: "Каталог", summary: "Карточки по ключам p:<productId> / u:<unitId>", body: obj({ keys: arr(str) }, ["keys"]), response: arr(ref("OfferCard")) } },
  "/products/{slug}": { get: { tag: "Каталог", summary: "Товар: варианты, характеристики, фото, совместимые аксессуары, похожие", params: [{ name: "slug", in: "path", required: true }] } },
  "/used/{code}": { get: { tag: "Б/у", summary: "Б/у экземпляр: состояние, фото, отчёт проверки", params: [{ name: "code", in: "path", required: true, description: "Например BA-U-1001" }] } },
  "/delivery-options": { get: { tag: "Заказ", summary: "Активные способы доставки" } },
  "/settings/public": { get: { tag: "Магазин", summary: "Публичные настройки: контакты, условия рассрочки, способы оплаты, критерии состояния" } },

  "/cart": { get: { tag: "Корзина", summary: "Текущая корзина (создаётся при необходимости)", auth: "optional", params: [CART_HEADER], response: ref("Cart") } },
  "/cart/items": { post: { tag: "Корзина", summary: "Добавить вариант товара или б/у экземпляр", auth: "optional", params: [CART_HEADER], body: { oneOf: [obj({ variantId: str, quantity: int }, ["variantId"]), obj({ usedUnitId: str }, ["usedUnitId"])] }, response: ref("Cart") } },
  "/cart/items/{id}": {
    patch: { tag: "Корзина", summary: "Изменить количество (0 — удалить)", auth: "optional", params: [{ name: "id", in: "path", required: true }, CART_HEADER], body: obj({ quantity: int }, ["quantity"]), response: ref("Cart") },
    delete: { tag: "Корзина", summary: "Удалить позицию", auth: "optional", params: [{ name: "id", in: "path", required: true }, CART_HEADER], response: ref("Cart") },
  },
  "/checkout/reserve": { post: { tag: "Заказ", summary: "Забронировать б/у экземпляры корзины на время оформления", auth: "optional", params: [CART_HEADER], response: obj({ reservedUntil: { type: "string", format: "date-time" }, minutes: int }) } },
  "/checkout/quote": { post: { tag: "Заказ", summary: "Серверный расчёт стоимости (товары, скидка, доставка, итог)", auth: "optional", params: [CART_HEADER], body: obj({ deliveryCode: str, promoCode: str }) } },
  "/orders": {
    get: { tag: "Заказ", summary: "Мои заказы", auth: "user" },
    post: {
      tag: "Заказ",
      summary: "Оформить заказ из корзины",
      description: "Цены, наличие и скидки пересчитываются сервером. expectedTotal — итог, который видел покупатель; при расхождении вернётся 409.",
      auth: "optional",
      params: [CART_HEADER],
      body: obj({ customerName: str, phone: str, email: str, city: str, address: str, comment: str, deliveryCode: str, paymentMethod: { type: "string", enum: ["CASH_ON_DELIVERY", "ONLINE"] }, promoCode: str, expectedTotal: int }, ["customerName", "phone", "city", "deliveryCode", "paymentMethod"]),
      response: obj({ number: str, status: str, total: int, accessToken: str, paymentMethod: str }),
    },
  },
  "/orders/{number}": { get: { tag: "Заказ", summary: "Заказ (владельцу или по токену гостя)", auth: "optional", params: [{ name: "number", in: "path", required: true }, { name: "token", in: "query", description: "accessToken гостевого заказа" }] } },
  "/orders/{number}/pay": { post: { tag: "Оплата", summary: "Создать платёжную сессию; клиент переходит по redirectUrl", auth: "optional", params: [{ name: "number", in: "path", required: true }], body: obj({ token: str }), response: obj({ paymentId: str, redirectUrl: str, isTest: bool }) } },
  "/payments/webhook/{provider}": { post: { tag: "Оплата", summary: "Уведомление платёжного провайдера (подпись проверяется, повторы игнорируются)", auth: "none", params: [{ name: "provider", in: "path", required: true }] } },

  "/auth/register": { post: { tag: "Аккаунт", summary: "Регистрация", body: obj({ name: str, phone: str, email: str, password: str, consent: bool }, ["name", "phone", "password", "consent"]), response: ref("AuthResult") } },
  "/auth/login": { post: { tag: "Аккаунт", summary: "Вход по телефону или email", description: "Возвращает token для заголовка Authorization: Bearer (мобильное приложение) и устанавливает cookie (сайт).", body: obj({ login: str, password: str }, ["login", "password"]), response: ref("AuthResult") } },
  "/auth/logout": { post: { tag: "Аккаунт", summary: "Выход (сессия удаляется на сервере)", auth: "user" } },
  "/auth/me": { get: { tag: "Аккаунт", summary: "Текущий пользователь", auth: "user" } },
  "/auth/password/forgot": { post: { tag: "Аккаунт", summary: "Запрос восстановления доступа", body: obj({ login: str }, ["login"]) } },
  "/auth/password/reset": { post: { tag: "Аккаунт", summary: "Новый пароль по токену из письма/SMS", body: obj({ token: str, password: str }, ["token", "password"]) } },
  "/auth/password/change": { post: { tag: "Аккаунт", summary: "Смена пароля", auth: "user", body: obj({ current: str, next: str }, ["current", "next"]) } },
  "/profile": { patch: { tag: "Аккаунт", summary: "Обновить профиль", auth: "user", body: obj({ name: str, email: str, city: str, address: str, locale: { type: "string", enum: ["ru", "kk"] } }) } },
  "/favorites": {
    get: { tag: "Аккаунт", summary: "Избранное", auth: "user", response: arr(ref("OfferCard")) },
    post: { tag: "Аккаунт", summary: "Добавить в избранное", auth: "user", body: { oneOf: [obj({ productId: str }), obj({ usedUnitId: str })] } },
    delete: { tag: "Аккаунт", summary: "Убрать из избранного", auth: "user", body: { oneOf: [obj({ productId: str }), obj({ usedUnitId: str })] } },
  },
  "/reviews": { post: { tag: "Аккаунт", summary: "Оставить отзыв (публикуется после модерации)", auth: "user", body: obj({ productId: str, rating: int, text: str }, ["productId", "rating", "text"]) } },
  "/support/tickets": {
    get: { tag: "Аккаунт", summary: "Мои обращения", auth: "user" },
    post: { tag: "Аккаунт", summary: "Новое обращение в поддержку", auth: "user", body: obj({ subject: str, message: str, orderNumber: str }, ["subject", "message"]) },
  },
  "/installment/calculate": { post: { tag: "Рассрочка", summary: "Расчёт: полная цена, взнос, ежемесячный платёж, график (без процентов)", body: obj({ price: int, downPayment: int, termMonths: int }, ["price", "downPayment", "termMonths"]) } },
  "/installment/applications": {
    get: { tag: "Рассрочка", summary: "Мои заявки", auth: "user" },
    post: { tag: "Рассрочка", summary: "Подать заявку (цена определяется сервером по товару)", auth: "optional", body: obj({ productId: str, variantId: str, usedUnitId: str, downPayment: int, termMonths: int, fullName: str, phone: str, city: str, comment: str, consent: bool }, ["productId", "downPayment", "termMonths", "fullName", "phone", "city", "consent"]) },
  },
  "/installment/contracts": { get: { tag: "Рассрочка", summary: "Мои договоры и графики платежей", auth: "user" } },
  "/media/{id}": { get: { tag: "Магазин", summary: "Изображение, загруженное через админ-панель", params: [{ name: "id", in: "path", required: true }] } },
};

export function openApiDocument(baseUrl: string) {
  const paths: Record<string, Record<string, object>> = {};
  for (const [path, methods] of Object.entries(ops)) {
    paths[path] = {};
    for (const [method, op] of Object.entries(methods)) {
      paths[path][method] = {
        tags: [op.tag],
        summary: op.summary,
        ...(op.description ? { description: op.description } : {}),
        ...(op.auth === "user" ? { security: [{ bearer: [] }, { cookie: [] }] } : op.auth === "optional" ? { security: [{}, { bearer: [] }, { cookie: [] }] } : {}),
        parameters: (op.params ?? []).map((p) => ({ name: p.name, in: p.in, required: p.in === "path" ? true : !!p.required, description: p.description, schema: p.schema ?? str })),
        ...(op.body ? { requestBody: { required: true, content: { "application/json": { schema: op.body } } } } : {}),
        responses: {
          "200": { description: "Успех", content: { "application/json": { schema: obj({ data: op.response ?? { type: "object" } }) } } },
          default: { description: "Ошибка", content: { "application/json": { schema: ref("Error") } } },
        },
      };
    }
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "B&A SMART API",
      version: "1.0.0",
      description:
        "REST API интернет-магазина B&A SMART. Общий для сайта и мобильных приложений (Android/iOS).\n\n" +
        "Формат ответа: `{ data }` при успехе или `{ error: { code, message, details } }` при ошибке.\n" +
        "Цены — целые тенге (KZT). Авторизация: cookie `ba_session` (сайт) или `Authorization: Bearer <token>` (приложение).",
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer", description: "Токен из /auth/login" },
        cookie: { type: "apiKey", in: "cookie", name: "ba_session" },
      },
      schemas: {
        Error: obj({ error: obj({ code: { type: "string", enum: ["BAD_REQUEST", "VALIDATION", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "OUT_OF_STOCK", "RESERVED", "RATE_LIMITED", "DISABLED", "INTERNAL"] }, message: str, details: { type: "object" } }, ["code", "message"]) }),
        OfferCard: obj({
          type: { type: "string", enum: ["product", "unit"] }, id: str, productId: str, href: str, name: str, brand: str, kind: str, category: str,
          condition: { type: "string", enum: ["NEW", "USED", "REFURBISHED"] }, image: { type: ["object", "null"] }, price: int, oldPrice: { type: ["integer", "null"] },
          inStock: bool, isNewArrival: bool, installmentAvailable: bool, storages: arr(int), colors: arr(obj({ name: str, hex: str })),
          variants: arr(obj({ id: str, color: str, colorHex: str, storageGb: int, price: int, oldPrice: int, stock: int })),
          grade: { type: "string", enum: ["EXCELLENT", "GOOD", "FAIR"] }, batteryHealth: int, code: str,
        }),
        Cart: obj({ id: str, token: str, count: int, subtotal: int, hasProblems: bool, lines: arr(obj({ id: str, kind: str, name: str, unitPrice: int, quantity: int, lineTotal: int, available: bool, problem: { type: ["string", "null"] } })) }),
        AuthResult: obj({ user: obj({ id: str, name: str }), token: str, expiresAt: { type: "string", format: "date-time" }, cartToken: str }),
      },
    },
    paths,
  };
}

export const API_OPERATIONS = ops;
