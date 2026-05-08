/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      useSiteSettings.ts
 * Mục đích:      Custom hook fetch và cache cài đặt hệ thống từ API.
 *                Chuyển đổi mảng key/value thành object để truy cập dễ dàng
 *                bằng cú pháp settings["SiteTitle"].
 * Các chức năng chính:
 *   - Fetch GET /settings khi component mount
 *   - Trả về object settings và trạng thái loading
 *   - Xử lý lỗi gracefully (giữ settings rỗng nếu fetch thất bại)
 *
 * Tên module:    Site Settings Hook
 * Module liên quan: lib/api.ts, backend/routes/settings.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type SiteSettings = Record<string, string>;

export function useSiteSettings(): { settings: SiteSettings; isLoading: boolean } {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: { key: string; value: string }[] }>("/settings")
      .then((data) => {
        const map: SiteSettings = {};
        for (const item of data.items || []) {
          map[item.key] = item.value;
        }
        setSettings(map);
      })
      .catch(() => {
        // Nếu fetch lỗi, giữ nguyên settings rỗng
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading };
}
