"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">ref {error.digest}</p>}
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
