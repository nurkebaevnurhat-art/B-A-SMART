"use client";
import { useEffect } from "react";

/** Регистрация service worker для PWA (установка сайта на экран смартфона) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
