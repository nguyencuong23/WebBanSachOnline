/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: bookImage.ts
 * Mục đích của file: Quản lý đường dẫn ảnh bìa sách.
 * Các chức năng chính: Ánh xạ category_id thành bucket name, tạo URL public từ file name.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Book Image Utils
 * Mục đích của module: Tiện ích xử lý URL ảnh của sách dựa theo thể loại.
 * Phạm vi xử lý: Client & Server.
 * Các thành phần chính trong module: getBookImageUrl.
 * Module liên quan: supabase.ts.
 * ============================================================================
 */
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

/**
 * Tên function: getBucketName
 * Mục đích của function: Tìm tên bucket trong Supabase Storage dựa vào prefix của category_id.
 * Tham số đầu vào: categoryId (mã thể loại, vd: "VH-001").
 * Giá trị trả về: Chuỗi tên bucket (vd: "van-hoc-images").
 */
function getBucketName(categoryId: string): string {
  // category_id looks like "VH-001" or just "VH"
  const prefix = String(categoryId).split("-")[0].toUpperCase();
  return BUCKET_MAP[prefix] || "books";
}

/**
 * Tên function: getBookImageUrl
 * Mục đích của function: Trả về URL public của ảnh bìa sách.
 * Điều kiện xử lý: Nếu imageUrl là link http/https hoặc base64 thì trả về luôn. Nếu là tên file, kết hợp với bucket tương ứng.
 * Tham số đầu vào: imageUrl (tên file hoặc url), categoryId (mã thể loại để tìm bucket).
 * Giá trị trả về: Chuỗi URL public.
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
