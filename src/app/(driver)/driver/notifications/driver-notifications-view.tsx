"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type DriverNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  read_at: string | null;
  action_url: string | null;
};

export function DriverNotificationsView({
  initialNotifications,
}: {
  initialNotifications: DriverNotification[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  async function markAsRead(id: string) {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read", read_at: new Date().toISOString() } : n))
      );
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, isManagement: false }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllAsRead() {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read", read_at: new Date().toISOString() }))
      );
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true, isManagement: false }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return n.status === "unread";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "unread"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            All Messages ({notifications.length})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      <section className="panel space-y-4">
        <div className="divide-y divide-line/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              {filter === "unread"
                ? "You have caught up with all notifications!"
                : "No notifications found."}
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = item.status === "unread";
              return (
                <div
                  key={item.id}
                  className={`py-4 flex items-start justify-between gap-4 text-xs transition-colors ${
                    isUnread ? "bg-amber-500/5 -mx-4 px-4 rounded-lg" : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{item.title}</span>
                      {isUnread && <StatusBadge tone="amber">New</StatusBadge>}
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed">{item.body}</p>
                    <time className="text-[10px] text-muted block pt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    {item.action_url && (
                      <Link
                        href={item.action_url}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Open →
                      </Link>
                    )}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="text-[11px] text-muted hover:text-ink cursor-pointer"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
