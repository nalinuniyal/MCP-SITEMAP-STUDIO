import { getSupabaseEnv } from "@/lib/env";
import { Logo } from "@/components/shell/logo";
import { SetupRequired } from "@/components/shell/setup-required";

const SAMPLE = `SalesforceInteractions.initSitemap({
  global: { onActionEvent: (e) => e },
  pageTypes: [{
    name: "product_detail",
    isMatch: () => /\\/p\\//.test(location.pathname),
    interaction: {
      name: CatalogObjectInteractionName.ViewCatalogObject,
      catalogObject: { type: "Product", id: resolveSku },
    },
  }],
});`;

// Per-user, per-request content: never prerender.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  if (!getSupabaseEnv()) return <SetupRequired />;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-10 lg:flex">
        <Logo />
        <div className="space-y-6">
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              One workspace for Marketing Cloud Personalization sitemaps.
            </h2>
            <p className="text-sm text-muted-foreground">
              Organise implementations by client and site, keep every sitemap file under access control, and build up
              validation and test history as you go.
            </p>
          </div>
          <pre className="max-w-lg overflow-hidden rounded-lg border bg-card p-4 text-[12px] leading-relaxed text-muted-foreground">
            {SAMPLE}
          </pre>
        </div>
        <p className="text-xs text-muted-foreground">
          Independent developer tool. Not affiliated with or endorsed by Salesforce.
        </p>
      </aside>
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
