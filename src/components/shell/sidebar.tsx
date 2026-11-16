"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, PLANNED_ITEMS } from "./nav-items";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import type { CurrentUser } from "@/lib/auth/dal";

export function SidebarContent({ user, onNavigate }: { user: CurrentUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" onClick={onNavigate} aria-label="MCP Sitemap Studio home">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-2" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div>
          <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">On the roadmap</p>
          <ul className="space-y-0.5">
            {PLANNED_ITEMS.map((item) => (
              <li
                key={item.label}
                className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground/70"
                title={`Arrives in phase ${item.phase}`}
              >
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                <span className="font-mono text-[10px]">P{item.phase}</span>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <UserMenu user={user} />
      </div>
    </div>
  );
}
