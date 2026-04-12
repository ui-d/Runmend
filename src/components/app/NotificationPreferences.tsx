"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface NotificationPreferencesProps {
  userId: string;
  workspaceId: string;
}

interface Preference {
  channel: string;
  is_enabled: boolean;
}

type Channel = "in_app" | "email" | "slack";

const CHANNELS: { id: Channel; label: string; description: string }[] = [
  {
    id: "in_app",
    label: "In-app notifications",
    description: "Show notifications in the bell icon",
  },
  {
    id: "email",
    label: "Email notifications",
    description: "Send email alerts for critical issues",
  },
];

export function NotificationPreferences({
  userId,
  workspaceId,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notification_preferences")
        .select("channel, is_enabled")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      setPreferences(data ?? []);
      setLoading(false);
    }
    load();
  }, [userId, workspaceId]);

  async function handleToggle(channel: "in_app" | "email" | "slack", enabled: boolean) {
    setPreferences((prev) => {
      const existing = prev.find((p) => p.channel === channel);
      if (existing) {
        return prev.map((p) =>
          p.channel === channel ? { ...p, is_enabled: enabled } : p
        );
      }
      return [...prev, { channel, is_enabled: enabled }];
    });

    const supabase = createClient();
    await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        workspace_id: workspaceId,
        channel,
        is_enabled: enabled,
      },
      { onConflict: "user_id,workspace_id,channel" }
    );
  }

  function isEnabled(channel: string): boolean {
    const pref = preferences.find((p) => p.channel === channel);
    return pref?.is_enabled ?? true; // default enabled
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about automation issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {CHANNELS.map((ch) => (
          <div key={ch.id} className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{ch.label}</Label>
              <p className="text-xs text-muted-foreground">{ch.description}</p>
            </div>
            <button
              onClick={() => handleToggle(ch.id, !isEnabled(ch.id))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isEnabled(ch.id) ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  isEnabled(ch.id) ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
