import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FolderKanban, Plus, Search } from "lucide-react";
import { listProjects } from "@/lib/services/projects";
import { APP_TYPES, APP_TYPE_VALUES, PLATFORMS, PLATFORM_VALUES, platformLabel, type AppType, type Platform } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageContainer, PageHeader } from "@/components/shell/page-header";
import { AppTypeBadge } from "@/components/projects/project-badges";
import { hostOf, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

const pick = <T extends string>(v: unknown, allowed: readonly T[]) =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const filters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    platform: pick<Platform>(sp.platform, PLATFORM_VALUES),
    appType: pick<AppType>(sp.appType, APP_TYPE_VALUES),
    status: pick(sp.status, ["active", "archived", "all"] as const) ?? "active",
  };
  const projects = await listProjects(filters);
  const filtered = Boolean(filters.q || filters.platform || filters.appType || filters.status !== "active");

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Each project holds the sitemap files, notes and history for one website or client."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus /> New project
            </Link>
          </Button>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={filters.q} placeholder="Search name, client or URL" className="pl-8" aria-label="Search projects" />
        </div>
        <NativeSelect name="platform" defaultValue={filters.platform ?? ""} aria-label="Platform" className="sm:w-52">
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="appType" defaultValue={filters.appType ?? ""} aria-label="Application type" className="sm:w-36">
          <option value="">SPA + MPA</option>
          {APP_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.short}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={filters.status} aria-label="Status" className="sm:w-32">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/projects">Reset</Link>
          </Button>
        )}
      </form>

      <Card className="overflow-hidden">
        {projects.length === 0 ? (
          filtered ? (
            <EmptyState icon={Search} title="No projects match these filters">
              Try a different search, or reset the filters.
            </EmptyState>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Create your first project"
              action={
                <Button size="sm" asChild>
                  <Link href="/projects/new">
                    <Plus /> New project
                  </Link>
                </Button>
              }
            >
              Add the website you&apos;re implementing Marketing Cloud Personalization on, then upload its sitemap.
            </EmptyState>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead className="hidden md:table-cell">Platform</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Website</TableHead>
                <TableHead className="text-right">Files</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-64">
                    <Link href={`/projects/${p.id}`} className="block truncate font-medium hover:text-primary">
                      {p.name}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{p.client_name ?? "No client"}</span>
                      {p.status === "archived" && <Badge variant="outline">Archived</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{platformLabel(p.platform)}</TableCell>
                  <TableCell>
                    <AppTypeBadge appType={p.app_type} />
                  </TableCell>
                  <TableCell className="hidden max-w-48 sm:table-cell">
                    {p.website_url ? (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        <span className="truncate">{hostOf(p.website_url)}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.file_count}</TableCell>
                  <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">
                    {timeAgo(p.last_activity_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {projects.length >= 200 && (
        <p className="text-xs text-muted-foreground">Showing the 200 most recently active projects. Narrow the search to find others.</p>
      )}
    </PageContainer>
  );
}
