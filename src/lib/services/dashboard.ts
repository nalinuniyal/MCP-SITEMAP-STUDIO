import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardData() {
  const supabase = await createClient();

  const [stats, recentProjects, recentUploads, validationRuns, templateProjects] = await Promise.all([
    supabase.rpc("dashboard_stats").single(),
    supabase
      .from("projects")
      .select("id, name, client_name, platform, app_type, status, last_activity_at")
      .eq("status", "active")
      .order("last_activity_at", { ascending: false })
      .limit(6),
    supabase
      .from("sitemap_files")
      .select("id, name, kind, size_bytes, created_at, project:projects(id, name)")
      .eq("source", "upload")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("validation_runs")
      .select("id, status, source, error_count, warning_count, info_count, created_at, project:projects(id, name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("projects")
      .select("id, name, last_activity_at, template:templates(id, name, platform, app_type)")
      .not("template_source_id", "is", null)
      .order("last_activity_at", { ascending: false })
      .limit(6),
  ]);

  for (const r of [stats, recentProjects, recentUploads, validationRuns, templateProjects]) {
    if (r.error) throw new Error(`Could not load dashboard: ${r.error.message}`);
  }

  return {
    stats: stats.data ?? {
      project_count: 0,
      active_project_count: 0,
      sitemap_file_count: 0,
      validation_run_count: 0,
      open_error_count: 0,
      open_warning_count: 0,
    },
    recentProjects: recentProjects.data ?? [],
    recentUploads: recentUploads.data ?? [],
    validationRuns: validationRuns.data ?? [],
    recentTemplates: dedupeTemplates(templateProjects.data ?? []),
  };
}

type TemplateRow = {
  id: string;
  name: string;
  last_activity_at: string;
  template: { id: string; name: string; platform: string; app_type: string } | null;
};

function dedupeTemplates(rows: TemplateRow[]) {
  const seen = new Map<string, { template: NonNullable<TemplateRow["template"]>; usedIn: string; usedAt: string }>();
  for (const row of rows) {
    if (!row.template || seen.has(row.template.id)) continue;
    seen.set(row.template.id, { template: row.template, usedIn: row.name, usedAt: row.last_activity_at });
  }
  return [...seen.values()];
}
