import { getSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import { SetupRequired } from "@/components/shell/setup-required";

// Per-user, per-request content: never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!getSupabaseEnv()) return <SetupRequired />;
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
