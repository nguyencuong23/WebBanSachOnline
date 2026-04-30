import express from "express";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseAnon, createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";

export const settingsRouter = express.Router();

settingsRouter.get("/settings", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("settings").select("*").order("key");
  assert(!error, 400, "Failed to fetch settings", "settings_fetch_failed", error?.message);
  res.json({ items: data });
});

settingsRouter.put("/admin/settings", requireUser, requireAdmin, async (req, res) => {
  const sb = createSupabaseAdmin();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  assert(items.length > 0, 400, "Missing items", "invalid_request");

  const payload = items.map((x) => ({
    key: String(x.key),
    value: String(x.value),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await sb.from("settings").upsert(payload).select("*");
  assert(!error, 400, "Failed to update settings", "settings_update_failed", error?.message);
  res.json({ items: data });
});

