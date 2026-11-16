import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppType, Platform, ProjectStatus } from "@/lib/domain/constants";
import type { ProjectInput } from "@/lib/validation/project";
import type { Tables } from "@/types/database";

export type Project = Tables<"projects">;
export type ProjectRole = "viewer" | "editor" | "owner";

export type ProjectListFilters = {
  q?: string;
  platform?: Platform;
  appType?: AppType;
  status?: ProjectStatus | "all";
};

export type ProjectListItem = Project & { file_count: number };

/** Escapes PostgREST filter syntax and LIKE wildcards in user search input. */
function toIlikePattern(q: string) {
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ");
  return `%${escaped}%`;
}

export async function listProjects(filters: ProjectListFilters = {}): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("*, sitemap_files(count)")
    .order("last_activity_at", { ascending: false })
    .limit(200);

  const status = filters.status ?? "active";
  if (status !== "all") query = query.eq("status", status);
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.appType) query = query.eq("app_type", filters.appType);
  const q = filters.q?.trim().slice(0, 100);
  if (q) {
    const p = toIlikePattern(q);
    query = query.or(`name.ilike.${p},client_name.ilike.${p},website_url.ilike.${p}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load projects: ${error.message}`);
  return (data ?? []).map(({ sitemap_files, ...rest }) => ({
    ...(rest as Project),
    file_count: (sitemap_files as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

/** Memoised per request so the project layout and page share one lookup. */
export const getProject = cache(async (projectId: string): Promise<{ project: Project; role: ProjectRole } | null> => {
  const supabase = await createClient();
  const [{ data: project, error }, { data: auth }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (error) throw new Error(`Could not load project: ${error.message}`);
  if (!project || !auth.user) return null;

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const role: ProjectRole = project.owner_id === auth.user.id ? "owner" : (membership?.role ?? "viewer");
  return { project, role };
});

export async function createProject(input: ProjectInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      client_name: input.clientName,
      platform: input.platform,
      app_type: input.appType,
      website_url: input.websiteUrl,
      description: input.description,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(projectId: string, input: ProjectInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      client_name: input.clientName,
      platform: input.platform,
      app_type: input.appType,
      website_url: input.websiteUrl,
      description: input.description,
    })
    .eq("id", projectId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Project not found, or you don't have permission to edit it.");
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ status }).eq("id", projectId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Project not found, or you don't have permission to change it.");
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").delete().eq("id", projectId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Project not found, or only the owner can delete it.");
}

export async function getProjectCounts(projectId: string) {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [files, notes, versions, runs] = await Promise.all([
    supabase.from("sitemap_files").select("id", head).eq("project_id", projectId),
    supabase.from("project_notes").select("id", head).eq("project_id", projectId),
    supabase.from("project_versions").select("id", head).eq("project_id", projectId),
    supabase.from("validation_runs").select("id", head).eq("project_id", projectId),
  ]);
  return {
    files: files.count ?? 0,
    notes: notes.count ?? 0,
    versions: versions.count ?? 0,
    validationRuns: runs.count ?? 0,
  };
}
