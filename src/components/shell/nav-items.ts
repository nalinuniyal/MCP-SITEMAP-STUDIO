import {
  Bot,
  CheckCheck,
  FileCode2,
  FolderKanban,
  LayoutDashboard,
  Library,
  MonitorPlay,
  Radar,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type PlannedItem = { label: string; icon: LucideIcon; phase: number };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

/** Modules on the roadmap. Shown so users know where things are going; not clickable. */
export const PLANNED_ITEMS: PlannedItem[] = [
  { label: "Template library", icon: Library, phase: 2 },
  { label: "Sitemap builder", icon: FileCode2, phase: 2 },
  { label: "Validator", icon: CheckCheck, phase: 3 },
  { label: "AI assistant", icon: Bot, phase: 4 },
  { label: "Testing studio", icon: MonitorPlay, phase: 5 },
  { label: "Event inspector", icon: Radar, phase: 5 },
];
