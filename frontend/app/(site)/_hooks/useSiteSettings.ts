/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: useSiteSettings.ts
 * Mục đích của file: Cung cấp custom hook lấy cấu hình của cửa hàng (settings) từ Server.
 * Các chức năng chính: Gọi API `/settings`, chuyển đổi thành object dạng key-value.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Site Settings Hook
 * Mục đích của module: Dễ dàng truy cập cấu hình giao diện từ mọi nơi ở Client.
 * Phạm vi xử lý: Client side.
 * Các thành phần chính trong module: SiteSettings, useSiteSettings.
 * Module liên quan: api.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Tên class/interface: SiteSettings
 * Mục đích của class/interface: Type định nghĩa cấu hình trả về.
 * Vai trò trong hệ thống: Record dictionary ánh xạ key-value.
 */
export type SiteSettings = Record<string, string>;

/**
 * Tên function: useSiteSettings
 * Mục đích của function: Fetch dữ liệu settings thông qua API và lưu vào React state.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Object chứa settings (dictionary) và isLoading.
 */
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
