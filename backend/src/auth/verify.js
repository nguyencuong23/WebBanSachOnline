import { assert } from "../http/errors.js";
import { createSupabaseAdmin } from "../supabase.js";
import { createSupabaseUser } from "../supabase.js";

export async function requireUser(req, res, next) {
  const auth = req.header("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  assert(m, 401, "Missing Bearer token", "unauthorized");

  const jwt = m[1];
  const sbAdmin = createSupabaseAdmin();
  const { data, error } = await sbAdmin.auth.getUser(jwt);
  assert(!error, 401, "Invalid token", "unauthorized", error?.message);

  req.auth = { jwt, user: data.user };

  // Load profile (RLS: user can read own profile)
  const sbUser = createSupabaseUser(jwt);
  const { data: profile, error: pErr } = await sbUser
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  assert(!pErr, 500, "Failed to load profile", "profile_load_failed", pErr?.message);
  req.profile = profile || null;

  next();
}

export function requireAdmin(req, res, next) {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  next();
}

