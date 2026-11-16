import { Badge } from "@/components/ui/badge";
import { appTypeShort, platformLabel, type AppType, type Platform } from "@/lib/domain/constants";

export function AppTypeBadge({ appType }: { appType: AppType }) {
  return (
    <Badge variant={appType === "spa" ? "info" : appType === "hybrid" ? "default" : "secondary"} className="font-mono">
      {appTypeShort(appType)}
    </Badge>
  );
}

export function PlatformLabel({ platform }: { platform: Platform }) {
  return <span className="text-muted-foreground">{platformLabel(platform)}</span>;
}
