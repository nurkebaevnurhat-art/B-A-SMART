import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { ResetForm } from "@/components/account/RecoverForms";

export const metadata: Metadata = { title: "Новый пароль", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getDict();
  return (
    <div className="container max-w-md py-14 md:py-20">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t.account.newPassword}</h1>
      {token ? <ResetForm token={token} /> : <p className="text-danger">Ссылка недействительна.</p>}
    </div>
  );
}
