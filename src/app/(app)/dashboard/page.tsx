import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCheck, FileCode2, FolderKanban, Library, Plus, TriangleAlert, Upload } from "lucide-react";
import { getDashboardData } from "@/lib/services/dashboard";
import { requireUser } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageContainer, PageHeader } from "@/components/shell/page-header";
import { AppTypeBadge } from "@/components/projects/project-badges";
import { UploadShortcut } from "@/components/dashboard/upload-shortcut";
import { formatBytes, timeAgo } from "@/lib/format";
import { platformLabel, type AppType, type Platform } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [user, data] = await Promise.all([requireUser(), getDashboardData()]);
  const { stats } = data;
  const firstName = user.displayName?.split(" ")[0];

  return (
    <PageContainer>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Your Marketing Cloud Personalization implementations at a glance."
        actions={
          <>
            <UploadShortcut projects={data.recentProjects.map((p) => ({ id: p.id, name: p.name }))} />
            <Button asChild>
              <Link href="/projects/new">
                <Plus /> New project
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={FolderKanban}
          label="Projects"
          value={stats.project_count}
          detail={`${stats.active_project_count} active`}
          href="/projects"
        />
        <Stat icon={FileCode2} label="Sitemap files" value={stats.sitemap_file_count} detail="across all projects" />
        <Stat icon={CheckCheck} label="Validation runs" value={stats.validation_run_count} detail="static and runtime" />
        <Stat
          icon={TriangleAlert}
          label="Open issues"
          value={stats.open_error_count + stats.open_warning_count}
          detail={`${stats.open_error_count} errors · ${stats.open_warning_count} warnings`}
          tone={stats.open_error_count > 0 ? "destructive" : undefined}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Recent projects</CardTitle>
              <CardDescription>Ordered by last activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                All projects <ArrowUpRight />
              </Link>
            </Button>
          </CardHeader>
          {data.recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              action={
                <Button size="sm" asChild>
                  <Link href="/projects/new">
                    <Plus /> Create your first project
                  </Link>
                </Button>
              }
            >
              A project groups the sitemap files, notes, versions and validation history for one website or client.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {data.recentProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.client_name, platformLabel(p.platform as Platform)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <AppTypeBadge appType={p.app_type as AppType} />
                    <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">
                      {timeAgo(p.last_activity_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent uploads</CardTitle>
              <CardDescription>Sitemap files uploaded to your projects</CardDescription>
            </div>
          </CardHeader>
          {data.recentUploads.length === 0 ? (
            <EmptyState icon={Upload} title="Nothing uploaded yet">
              Upload existing .js or .txt sitemap files from a project&apos;s Files tab.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {data.recentUploads.map((f) => {
                const project = f.project as { id: string; name: string } | null;
                return (
                  <li key={f.id}>
                    <Link
                      href={project ? `/projects/${project.id}/files/${f.id}` : "#"}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-medium">{f.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{project?.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(f.size_bytes)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Validation history</CardTitle>
              <CardDescription>Latest runs across your projects</CardDescription>
            </div>
          </CardHeader>
          {data.validationRuns.length === 0 ? (
            <EmptyState icon={CheckCheck} title="No validation runs yet">
              The static validation engine (syntax, page types, events, catalog, identity, SPA lifecycle and more)
              arrives in Phase 3. Runs will be listed here with their findings.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {data.validationRuns.map((r) => {
                const project = r.project as { id: string; name: string } | null;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <Badge variant={r.source === "runtime" ? "info" : "outline"} className="font-mono">
                      {r.source}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">{project?.name}</span>
                    <span className="text-xs tabular-nums">
                      <span className="text-destructive">{r.error_count}E</span>{" "}
                      <span className="text-warning">{r.warning_count}W</span>
                    </span>
                    <span className="w-24 text-right text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recently used templates</CardTitle>
              <CardDescription>Templates your projects started from</CardDescription>
            </div>
          </CardHeader>
          {data.recentTemplates.length === 0 ? (
            <EmptyState icon={Library} title="No templates used yet">
              The template library (SFCC, Shopify, Magento, React, Angular, Vue, Next.js and more) arrives in Phase 2.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {data.recentTemplates.map(({ template, usedIn, usedAt }) => (
                <li key={template.id} className="px-4 py-2.5">
                  <p className="truncate text-sm font-medium">{template.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Used in {usedIn} · {timeAgo(usedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  detail: string;
  href?: string;
  tone?: "destructive";
}) {
  const body = (
    <CardContent className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4" />
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${tone === "destructive" ? "text-destructive" : ""}`}>
        {value.toLocaleString()}
      </p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </CardContent>
  );
  return (
    <Card className={href ? "transition-colors hover:border-primary/40" : undefined}>
      {href ? <Link href={href}>{body}</Link> : body}
    </Card>
  );
}
