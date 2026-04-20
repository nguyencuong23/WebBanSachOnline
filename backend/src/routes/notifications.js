import express from "express";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const notificationsRouter = express.Router();

notificationsRouter.get("/notifications", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  assert(!error, 400, "Failed to fetch notifications", "notifications_fetch_failed", error?.message);
  res.json({ items: data });
});

notificationsRouter.get("/notifications/unread-count", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const { data, error } = await sb.from("notifications").select("id").eq("is_read", false);
  assert(!error, 400, "Failed to fetch notifications", "notifications_fetch_failed", error?.message);
  res.json({ count: data?.length || 0 });
});

notificationsRouter.post("/notifications/:id/read", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const id = Number(req.params.id);
  const { error } = await sb.from("notifications").update({ is_read: true }).eq("id", id);
  assert(!error, 400, "Failed to mark read", "notification_update_failed", error?.message);
  res.json({ ok: true });
});

notificationsRouter.post("/notifications/read-all", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("notifications").update({ is_read: true }).eq("is_read", false);
  assert(!error, 400, "Failed to mark all read", "notification_update_failed", error?.message);
  res.json({ ok: true });
});

