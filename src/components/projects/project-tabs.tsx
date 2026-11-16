"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId, counts }: { projectId: string; counts: { files: number; notes: number } }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/files`, label: "Files", count: counts.files },
    { href: `${base}/notes`, label: "Notes", count: counts.notes },
    { href: `${base}/settings`, label: "Settings" },
  ];
  return (
    <nav aria-label="Project sections" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="rounded bg-muted px-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
