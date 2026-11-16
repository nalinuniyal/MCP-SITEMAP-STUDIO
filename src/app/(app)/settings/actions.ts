"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z
    .object({ displayName: z.string().trim().min(1, "Enter your name").max(80) })
    .safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", user.id);
  if (error) return { status: "error", message: error.message };
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile updated." };
}
