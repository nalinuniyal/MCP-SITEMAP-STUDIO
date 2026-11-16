import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProfileForm } from "@/components/shell/profile-form";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title="Account settings" />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown to people you share projects with.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <ProfileForm displayName={user.displayName} email={user.email} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>We&apos;ll email you a secure link to choose a new password.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/forgot-password">Send password reset link</Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
