import { handler } from "@/lib/api";
import { getSetting } from "@/server/services/settings";
import { paymentsAreTest } from "@/server/services/payments";

/** Публичные настройки магазина для сайта и мобильного приложения */
export const GET = handler(async () => {
  const [store, installment, checkout, grades] = await Promise.all([getSetting("store"), getSetting("installment"), getSetting("checkout"), getSetting("grades")]);
  return {
    store,
    grades,
    checkout,
    installment: { enabled: installment.enabled, isDemo: installment.isDemo, terms: installment.terms, minDownPercent: installment.minDownPercent, markupPercentByTerm: installment.markupPercentByTerm, minPrice: installment.minPrice, maxPrice: installment.maxPrice },
    payments: { testMode: paymentsAreTest() },
  };
});
