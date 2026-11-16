"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./sidebar";
import { Logo } from "./logo";
import type { CurrentUser } from "@/lib/auth/dal";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent user={user} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open navigation">
                <Menu />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-sidebar shadow-xl outline-none">
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <SidebarContent user={user} onNavigate={() => setOpen(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <Logo />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
