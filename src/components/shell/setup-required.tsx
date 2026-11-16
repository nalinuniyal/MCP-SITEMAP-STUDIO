import { Database, KeyRound } from "lucide-react";
import { Logo } from "./logo";

/** Shown instead of the app when no Supabase project is configured. */
export function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Connect a Supabase project</h1>
        <p className="text-sm text-muted-foreground">
          MCP Sitemap Studio stores projects, sitemap files and validation history in Supabase (Postgres with Row
          Level Security) and uses Supabase Auth for sign-in. No project is configured for this deployment yet.
        </p>
      </div>
      <ol className="space-y-4 rounded-lg border bg-card p-5 text-sm">
        <li className="flex gap-3">
          <Database className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Apply the database migrations</p>
            <p className="text-muted-foreground">
              Run <code className="rounded bg-muted px-1 py-0.5 text-xs">npx supabase link</code> then{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">npx supabase db push</code> from the repository
              root.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Set the environment variables</p>
            <p className="text-muted-foreground">
              Copy <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code> to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> and fill in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, then
              restart the server.
            </p>
          </div>
        </li>
      </ol>
    </main>
  );
}
