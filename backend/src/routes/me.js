import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const meRouter = express.Router();

meRouter.get("/me", requireUser, async (req, res) => {
  res.json({
    user: req.auth.user,
    profile: req.profile
  });
});

meRouter.patch("/me", requireUser, async (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().max(100).optional(),
    phone_number: z.string().trim().min(8).max(15).optional()
  });
  const body = schema.parse(req.body ?? {});

  const sbUser = createSupabaseUser(req.auth.jwt);
  const { data, error } = await sbUser
    .from("profiles")
    .update({
      ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone_number !== undefined ? { phone_number: body.phone_number } : {})
    })
    .eq("user_id", req.auth.user.id)
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Failed to update profile", "profile_update_failed", error?.message);
  res.json({ profile: data });
});

