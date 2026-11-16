"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/routes";
import { getSiteUrl } from "@/lib/site-url";
import type { ActionState } from "@/lib/action-state";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use 72 characters or fewer");

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email, password: z.string().min(1, "Enter your password").max(72) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.name === "AuthRetryableFetchError" || !error.status) {
      return { status: "error", message: "Couldn't reach the authentication service. Try again in a moment." };
    }
    // Same message for unknown email and wrong password.
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email address first. Check your inbox for the link."
        : "Email or password is incorrect.";
    return { status: "error", message };
  }
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      displayName: z.string().trim().min(1, "Enter your name").max(80),
      email,
      password,
    })
    .safeParse({
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: [error.message] } };
    return { status: "error", message: error.message };
  }
  // With email confirmation disabled, Supabase returns a session immediately.
  if (data.session) redirect("/dashboard");
  return {
    status: "success",
    message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
  };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  });
  // Never reveal whether the account exists.
  return { status: "success", message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
