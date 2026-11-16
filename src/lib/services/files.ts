import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FILE_LIMITS } from "@/lib/domain/constants";
import type { AcceptedFile } from "@/lib/validation/files";
import type { Tables } from "@/types/database";

export type SitemapFileSummary = Pick<
  Tables<"sitemap_files">,
  "id" | "project_id" | "name" | "kind" | "source" | "size_bytes" | "content_sha256" | "original_filename" | "created_at" | "updated_at"
>;

const SUMMARY_COLUMNS =
  "id, project_id, name, kind, source, size_bytes, content_sha256, original_filename, created_at, updated_at";

export async function listProjectFiles(projectId: string): Promise<SitemapFileSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sitemap_files")
    .select(SUMMARY_COLUMNS)
    .eq("project_id", projectId)
    .order("name");
  if (error) throw new Error(`Could not load files: ${error.message}`);
  return data ?? [];
}

export async function getFile(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sitemap_files").select("*").eq("id", fileId).maybeSingle();
  if (error) throw new Error(`Could not load file: ${error.message}`);
  return data;
}

export async function insertFiles(projectId: string, files: AcceptedFile[]) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("sitemap_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) + files.length > FILE_LIMITS.maxFilesPerProject) {
    throw new Error(`A project can hold at most ${FILE_LIMITS.maxFilesPerProject} files.`);
  }
  const { data, error } = await supabase
    .from("sitemap_files")
    .insert(
      files.map((f) => ({
        project_id: projectId,
        name: f.name,
        kind: f.kind,
        content: f.content,
        source: "upload" as const,
        original_filename: f.originalName,
      })),
    )
    .select("id, name");
  if (error) {
    if (error.code === "42501") throw new Error("You don't have permission to upload to this project.");
    if (error.code === "23505") throw new Error("A file with that name was added at the same time. Try again.");
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function deleteFile(projectId: string, fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sitemap_files")
    .delete()
    .eq("id", fileId)
    .eq("project_id", projectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("File not found, or you don't have permission to delete it.");
}
