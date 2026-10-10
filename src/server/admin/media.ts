import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 5 * 1024 * 1024;

/** Сохраняет изображение в БД и возвращает URL для отдачи через /api/v1/media/:id */
export async function storeImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new AppError("VALIDATION", "Допустимы изображения JPEG, PNG, WebP или AVIF");
  if (file.size > MAX) throw new AppError("VALIDATION", "Файл больше 5 МБ");
  const buf = Buffer.from(await file.arrayBuffer());
  // Проверка сигнатуры файла, а не только заявленного типа
  const sig = buf.subarray(0, 12);
  const ok =
    (sig[0] === 0xff && sig[1] === 0xd8) ||
    sig.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (sig.subarray(0, 4).toString() === "RIFF" && sig.subarray(8, 12).toString() === "WEBP") ||
    sig.subarray(4, 12).toString().startsWith("ftypavi");
  if (!ok) throw new AppError("VALIDATION", "Файл не похож на изображение");
  const f = await db.mediaFile.create({ data: { mime: file.type, size: file.size, data: buf } });
  return `/api/v1/media/${f.id}`;
}
