import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { pageUser } from "@/server/guards";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser("/account");
  const { t } = await getDict();
  return (
    <div className="container pb-20 pt-8 md:pt-12">
      <p className="text-sm text-muted">{t.account.title}</p>
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{user.name}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
