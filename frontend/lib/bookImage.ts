import { supabase } from "./supabase";

/**
 * Map category_id prefix → Supabase Storage bucket name.
 * Must match the mapping in BooksAdmin.tsx.
 */
const BUCKET_MAP: Record<string, string> = {
  VH: "van-hoc-images",
  KT: "kinh-te-images",
  TL: "tam-ly-images",
  KH: "khoa-hoc-images",
  LS: "lich-su-images",
  NN: "ngoai-ngu-images",
  GD: "giao-duc-images",
  TH: "triet-hoc-images",
  MG: "manga-images",
  LN: "light-novel-images",
};

function getBucketName(categoryId: string): string {
  // category_id looks like "VH-001" or just "VH"
  const prefix = String(categoryId).split("-")[0].toUpperCase();
  return BUCKET_MAP[prefix] || "books";
}

/**
 * Convert a stored image filename (e.g. "VH-001.webp") and a category_id
 * into a full Supabase public URL.
 *
 * If imageUrl is already a full http/https URL (legacy or external link),
 * it is returned as-is.
 */
export function getBookImageUrl(imageUrl: string | null | undefined, categoryId: string | null | undefined): string {
  if (!imageUrl) return "";

  // Already a full URL (http / https / data:) — return as-is
  if (/^https?:\/\/|^data:/i.test(imageUrl)) return imageUrl;

  // It's a filename stored in Supabase Storage
  const bucket = getBucketName(categoryId || "");
  const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
  return data.publicUrl;
}
