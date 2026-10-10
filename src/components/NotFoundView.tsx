import { ButtonLink } from "./ui/Button";

export function NotFoundView() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="font-display text-7xl font-semibold text-accent">404</div>
      <h1 className="mt-4 font-display text-2xl font-semibold">Страница не найдена</h1>
      <p className="mt-2 max-w-md text-graphite">Возможно, товар продан или ссылка устарела. Загляните в каталог — там много интересного.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/catalog/smartphones">Смартфоны</ButtonLink>
        <ButtonLink href="/used" variant="outline">Б/у</ButtonLink>
        <ButtonLink href="/" variant="ghost">На главную</ButtonLink>
      </div>
    </div>
  );
}
