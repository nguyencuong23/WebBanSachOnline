/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      bookImage.ts
 * Mục đích:      Cung cấp hàm tiện ích để chuyển đổi tên file ảnh bìa sách
 *                thành URL công khai đầy đủ từ Supabase Storage, dựa trên
 *                bucket tương ứng với thể loại sách.
 * Các chức năng chính:
 *   - BUCKET_MAP     : Map từ mã thể loại sang tên bucket Storage
 *   - getBucketName  : Lấy tên bucket từ category_id
 *   - getBookImageUrl: Tạo URL công khai cho ảnh bìa sách
 *
 * Tên module:    Book Image Utilities
 * Module liên quan: lib/supabase.ts, app/admin/books/BooksAdmin.tsx,
 *                   app/(site)/books/[bookId]/BookDetailPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Mapping bucket phải khớp với BooksAdmin.tsx.
 *                Mỗi thể loại sách có bucket Storage riêng để tổ chức ảnh theo nhóm.
 * ============================================================================
 */

import { supabase } from "./supabase";

/**
 * Map từ mã prefix thể loại sách sang tên bucket Supabase Storage tương ứng.
 * Key là 2 ký tự đầu của category_id (ví dụ: "VH" từ "VH-001").
 * @type {Record<string, string>}
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
 * Lấy tên bucket Supabase Storage tương ứng với category_id.
 * Trích xuất prefix (phần trước dấu "-") để tra cứu trong BUCKET_MAP.
 *
 * @param {string} categoryId - Mã thể loại sách (ví dụ: "VH-001" hoặc "VH").
 * @returns {string} Tên bucket Storage, mặc định là "books" nếu không tìm thấy.
 */
function getBucketName(categoryId: string): string {
  // category_id looks like "VH-001" or just "VH"
  const prefix = String(categoryId).split("-")[0].toUpperCase();
  return BUCKET_MAP[prefix] || "books";
}

/**
 * Chuyển đổi tên file ảnh bìa sách và category_id thành URL công khai đầy đủ.
 * Nếu imageUrl đã là URL đầy đủ (http/https/data:), trả về nguyên vẹn.
 * Nếu là tên file, tạo URL từ Supabase Storage bucket tương ứng với thể loại.
 *
 * @param {string | null | undefined} imageUrl    - Tên file ảnh (ví dụ: "VH-001.webp")
 *                                                  hoặc URL đầy đủ (legacy/external).
 * @param {string | null | undefined} categoryId  - Mã thể loại để xác định bucket.
 * @returns {string} URL công khai đầy đủ của ảnh bìa, hoặc chuỗi rỗng nếu không có.
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
