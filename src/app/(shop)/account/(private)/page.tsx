import { getDict } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/format";
import { pageUser } from "@/server/guards";
import { getShell } from "@/server/layout-data";
import { PasswordForm, ProfileForm } from "@/components/account/ProfileForms";

export default async function ProfilePage() {
  const user = await pageUser("/account");
  const { locale, t } = await getDict();
  const shell = await getShell(locale);
  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 font-sans text-xl font-semibold">{t.account.profile}</h2>
        <ProfileForm initial={{ name: user.name, email: user.email ?? "", city: user.city ?? "", address: user.address ?? "", phone: user.phone ? formatPhone(user.phone) : "" }} cities={shell.store.cities} />
      </section>
      <section>
        <h2 className="mb-6 font-sans text-xl font-semibold">Безопасность</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
