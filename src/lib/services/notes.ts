import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listNotes(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_notes")
    .select("id, body, pinned, created_at, updated_at, created_by, author:profiles(display_name, email)")
    .eq("project_id", projectId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load notes: ${error.message}`);
  return data ?? [];
}

export type ProjectNote = Awaited<ReturnType<typeof listNotes>>[number];

export async function createNote(projectId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_notes").insert({ project_id: projectId, body });
  if (error) throw new Error(error.code === "42501" ? "You don't have permission to add notes here." : error.message);
}

export async function updateNote(projectId: string, noteId: string, patch: { body?: string; pinned?: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_notes")
    .update(patch)
    .eq("id", noteId)
    .eq("project_id", projectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Note not found, or you can only edit your own notes.");
}

export async function deleteNote(projectId: string, noteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_notes")
    .delete()
    .eq("id", noteId)
    .eq("project_id", projectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Note not found, or you can only delete your own notes.");
}
