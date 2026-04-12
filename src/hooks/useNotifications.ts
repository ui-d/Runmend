"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications(userId: string, workspaceId: string) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch initial notifications
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/notifications?workspaceId=${workspaceId}&limit=20`
        );
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [workspaceId]);

  // Subscribe to Realtime for new notifications
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationRow;
          if (newNotification.workspace_id === workspaceId) {
            setNotifications((prev) => [newNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, workspaceId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
  }, [workspaceId]);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
