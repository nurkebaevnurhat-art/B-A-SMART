import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { RecoverForm } from "@/components/account/RecoverForms";

export const metadata: Metadata = { title: "Восстановление доступа", robots: { index: false } };

export default async function RecoverPage() {
  const { t } = await getDict();
  return (
    <div className="container max-w-md py-14 md:py-20">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t.account.recover}</h1>
      <RecoverForm />
    </div>
  );
}
