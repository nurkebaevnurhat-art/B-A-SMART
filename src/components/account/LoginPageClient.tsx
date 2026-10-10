"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";

export function LoginPageClient({ next, tab }: { next: string; tab?: "login" | "register" }) {
  const router = useRouter();
  return (
    <LoginForm
      initialTab={tab}
      onSuccess={() => {
        router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
        router.refresh();
      }}
    />
  );
}
