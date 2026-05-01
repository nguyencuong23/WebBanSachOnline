import express from "express";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseAnon, createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

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

settingsRouter.post("/admin/settings/upload-image", requireUser, requireAdmin, async (req, res) => {
  const schema = z.object({
    base64: z.string().min(1, "Thiếu dữ liệu ảnh"),
    contentType: z.string().min(1, "Thiếu định dạng ảnh"),
    key: z.string().min(1, "Thiếu key cài đặt")
  });
  const body = schema.parse(req.body ?? {});

  const sb = createSupabaseAdmin();
  const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = body.contentType.split("/")[1] || "jpg";
  const fileName = `${body.key}_${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from("web-images")
    .upload(fileName, buffer, { contentType: body.contentType, upsert: true });

  assert(!error, 400, "Lỗi upload ảnh", "upload_failed", error?.message);

  const { data: publicUrlData } = sb.storage.from("web-images").getPublicUrl(fileName);
  res.json({ url: publicUrlData.publicUrl });
});

