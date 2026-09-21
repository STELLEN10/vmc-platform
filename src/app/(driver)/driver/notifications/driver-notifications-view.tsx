"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  DollarSign,
  Wrench,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  markDriverNotificationAsRead,
  markAllDriverNotificationsAsRead,
} from "./actions";

export type DriverNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: "unread" | "read" | "archived";
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

export function DriverNotificationsView({
  notifications,
}: {
  notifications: DriverNotificationItem[];
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();

  const filtered = notifications.filter((n) =>
    filter === "unread" ? n.status === "unread" : true
  );

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const handleMarkSingle = (id: string) => {
    startTransition(async () => {
      await markDriverNotificationAsRead(id);
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllDriverNotificationsAsRead();
    });
  };

  const getTargetHref = (notif: DriverNotificationItem) => {
    if (notif.related_entity_type === "payment_period" || notif.type.startsWith("payment_")) {
      return "/driver/payments";
    }
    if (notif.related_entity_type === "maintenance_request" || notif.type.startsWith("maintenance_")) {
      return "/driver/maintenance";
    }
    if (notif.related_entity_type === "emergency_report" || notif.type.startsWith("emergency_")) {
      return "/driver/emergency";
    }
    if (notif.related_entity_type === "contract") {
      return "/driver/profile";
    }
    return "/driver";
  };

  const getIcon = (type: string) => {
    if (type.includes("payment")) {
      return <DollarSign className="h-5 w-5 text-emerald-600" />;
    }
    if (type.includes("maintenance")) {
      return <Wrench className="h-5 w-5 text-blue-600" />;
    }
    if (type.includes("emergency")) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    if (type.includes("contract")) {
      return <FileText className="h-5 w-5 text-indigo-600" />;
    }
    return <Bell className="h-5 w-5 text-neutral-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">
              Notification Inbox
            </h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Payment reminders, verification status, and maintenance updates for your motorcycle.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAll}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === "unread"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-medium text-neutral-900">
              No notifications
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              You are completely up to date with your payment reminders and alerts.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition ${
                item.status === "unread"
                  ? "border-blue-200 bg-blue-50/50 shadow-sm"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-neutral-200 bg-white p-2">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-neutral-900">
                        {item.title}
                      </h4>
                      {item.status === "unread" && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">{item.body}</p>

                    <div className="mt-2 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString("en-ZA")}
                      </span>

                      <Link
                        href={getTargetHref(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
                      >
                        View Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {item.status === "unread" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleMarkSingle(item.id)}
                    className="shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
