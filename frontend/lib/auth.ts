import { apiFetch } from "./api";
import { supabase } from "./supabase";

export interface Profile {
  user_id: string;
  username: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  default_address?: string;
  role: 'admin' | 'user';
  loyalty_points: number;
  is_active: boolean;
  customer_note?: string;
  created_at: string;
  updated_at: string;
}

export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const res = await apiFetch<{ profile: Profile | null }>("/me");
  return res.profile;
}
