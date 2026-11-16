import { cn } from "@/lib/utils";

/** Wordmark: a bracketed node graph, hinting at page types wired into a sitemap. */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-6 shrink-0">
        <rect x="1" y="1" width="22" height="22" rx="6" className="fill-primary" />
        <path
          d="M7.5 7v10M16.5 7v10M7.5 12h9"
          className="stroke-primary-foreground"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="7.5" cy="7" r="1.7" className="fill-primary-foreground" />
        <circle cx="16.5" cy="17" r="1.7" className="fill-primary-foreground" />
      </svg>
      {withText && (
        <span className="text-sm font-semibold tracking-tight">
          Sitemap Studio <span className="font-mono text-[11px] font-normal text-muted-foreground">MCP</span>
        </span>
      )}
    </span>
  );
}
