import { apiFetch } from "./api";
import { supabase } from "./supabase";

export type Profile = {
  user_id: string;
  role: "admin" | "user";
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  is_active: boolean;
};

export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const res = await apiFetch<{ profile: Profile | null }>("/me");
  return res.profile;
}

