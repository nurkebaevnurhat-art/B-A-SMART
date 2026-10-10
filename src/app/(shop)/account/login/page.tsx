import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import { LoginPageClient } from "@/components/account/LoginPageClient";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const sp = await searchParams;
  const next = sp.next ?? "/account";
  if (await getCurrentUser()) redirect(next.startsWith("/") ? next : "/account");
  const { t } = await getDict();
  return (
    <div className="container max-w-md py-14 md:py-20">
      <h1 className="mb-8 text-center font-display text-3xl font-semibold">{t.account.title}</h1>
      <LoginPageClient next={next} tab={sp.tab === "register" ? "register" : "login"} />
    </div>
  );
}
