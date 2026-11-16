import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCheck, FileCode2, GitCommitHorizontal, Info, StickyNote } from "lucide-react";
import { getProject, getProjectCounts } from "@/lib/services/projects";
import { listProjectFiles } from "@/lib/services/files";
import { listNotes } from "@/lib/services/notes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/page-header";
import { APP_TYPES, platformLabel } from "@/lib/domain/constants";
import { formatBytes, timeAgo } from "@/lib/format";

export default async function ProjectOverviewPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const found = await getProject(projectId);
  if (!found) notFound();
  const { project } = found;
  const [counts, files, notes] = await Promise.all([
    getProjectCounts(projectId),
    listProjectFiles(projectId),
    listNotes(projectId),
  ]);
  const appType = APP_TYPES.find((a) => a.value === project.app_type)!;
  const pinned = notes.filter((n) => n.pinned).slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section aria-label="Counts" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={FileCode2} label="Files" value={counts.files} />
          <MiniStat icon={StickyNote} label="Notes" value={counts.notes} />
          <MiniStat icon={GitCommitHorizontal} label="Versions" value={counts.versions} />
          <MiniStat icon={CheckCheck} label="Validation runs" value={counts.validationRuns} />
        </section>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sitemap files</CardTitle>
              <CardDescription>Most recently changed</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}/files`}>
                Manage files <ArrowUpRight />
              </Link>
            </Button>
          </CardHeader>
          {files.length === 0 ? (
            <EmptyState
              icon={FileCode2}
              title="No sitemap files yet"
              action={
                <Button size="sm" asChild>
                  <Link href={`/projects/${projectId}/files#upload`}>Upload files</Link>
                </Button>
              }
            >
              Upload the site&apos;s existing sitemap (.js or .txt). Files are stored as text and never executed.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {[...files]
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 5)
                .map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/projects/${projectId}/files/${f.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
                    >
                      <FileCode2 className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate font-mono text-xs">{f.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(f.size_bytes)}</span>
                      <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{timeAgo(f.updated_at)}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Validation & version history</CardTitle>
              <CardDescription>Saved versions and validation runs for this project</CardDescription>
            </div>
          </CardHeader>
          {counts.versions + counts.validationRuns === 0 ? (
            <EmptyState icon={CheckCheck} title="Nothing recorded yet">
              Saving versions arrives with the code editor in Phase 2, and validation runs with the validator in Phase
              3. Both are already stored per project, so history will appear here as soon as they ship.
            </EmptyState>
          ) : (
            <CardContent className="text-sm text-muted-foreground">
              {counts.versions} saved version{counts.versions === 1 ? "" : "s"} and {counts.validationRuns} validation
              run{counts.validationRuns === 1 ? "" : "s"} recorded. Detailed history views arrive in Phases 2 and 3.
            </CardContent>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Detail label="Platform">{platformLabel(project.platform)}</Detail>
              <Detail label="Application type">
                {appType.label}
                <p className="mt-0.5 text-xs text-muted-foreground">{appType.hint}</p>
              </Detail>
              <Detail label="Template source">
                <span className="text-muted-foreground">{project.template_source_id ? "Template" : "None (started from own code)"}</span>
              </Detail>
              <Detail label="Created">{new Date(project.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</Detail>
              {project.description && (
                <Detail label="Description">
                  <p className="whitespace-pre-wrap text-muted-foreground">{project.description}</p>
                </Detail>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pinned notes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}/notes`}>
                All notes <ArrowUpRight />
              </Link>
            </Button>
          </CardHeader>
          {pinned.length === 0 ? (
            <EmptyState icon={Info} title="No pinned notes">
              Pin notes about environments, quirks or client decisions to keep them here.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {pinned.map((n) => (
                <li key={n.id} className="line-clamp-4 px-4 py-3 text-sm whitespace-pre-wrap">
                  {n.body}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
