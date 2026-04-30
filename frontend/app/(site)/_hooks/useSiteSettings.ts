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
