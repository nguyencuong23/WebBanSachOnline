import { Router } from "express";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";

export const notificationsRouter = Router();

// Lấy danh sách thông báo của user hiện tại
notificationsRouter.get("/api/notifications", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.profile.user_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  res.json({ items: data || [] });
});

// Đánh dấu 1 thông báo là đã đọc
notificationsRouter.patch("/api/notifications/:id/read", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);
  const { id } = req.params;

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", req.profile.user_id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);

  res.json({ item: data });
});

// Đánh dấu tất cả là đã đọc
notificationsRouter.post("/api/notifications/read-all", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", req.profile.user_id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);

  res.json({ ok: true });
});
