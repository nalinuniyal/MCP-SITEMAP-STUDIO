import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  // Reached from the reset email; the callback route has already created a session.
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=link_invalid");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <Logo />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">For {user.email}</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
