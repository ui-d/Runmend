import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutomationProfile, getHealthStatus, getHealthColorClasses, getPlatformLabel } from "@/lib/types";

interface ProfileCardProps {
  profile: AutomationProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const status = getHealthStatus(profile.healthScore);
  const colors = getHealthColorClasses(status);

  return (
    <Link href={`/dashboard/${profile.id}`}>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:border-foreground/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 h-full">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wider"
            >
              {getPlatformLabel(profile.platform)}
            </Badge>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${colors.bg}`}
              />
              <span className={`text-sm font-medium ${colors.text}`}>
                {profile.healthScore}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-1">{profile.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {profile.industry}
          </p>

          <p className="text-sm text-muted-foreground/80 mb-6 flex-1">
            {profile.description}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              {profile.scenarioCount} automations
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all">
              Run audit
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
