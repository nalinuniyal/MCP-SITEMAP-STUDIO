import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll email you a link to choose a new one.</p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
        ← Back to sign in
      </Link>
    </>
  );
}
