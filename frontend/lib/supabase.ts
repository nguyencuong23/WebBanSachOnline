import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: {
    // Tắt detectSessionInUrl để tránh reload khi chuyển tab (do Supabase lắng nghe visibilitychange)
    detectSessionInUrl: false,
    // Vẫn giữ auto refresh token nhưng không re-trigger khi tab focus lại
    persistSession: true,
    autoRefreshToken: true,
  },
});
