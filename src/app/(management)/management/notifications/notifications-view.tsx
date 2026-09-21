"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertTriangle,
  Send,
  Wrench,
  DollarSign,
  UserCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  markManagementNotificationAsRead,
  markAllManagementNotificationsAsRead,
  triggerPaymentReminders,
  sendCustomNotification,
} from "./actions";

export type ManagementNotificationItem = {
  id: string;
  type: string;
  driver_profile_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
};

export type DriverOption = {
  profile_id: string;
  full_name: string | null;
  phone: string | null;
};

export function NotificationsView({
  notifications,
  driverOptions,
}: {
  notifications: ManagementNotificationItem[];
  driverOptions: DriverOption[];
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const [reminderResult, setReminderResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleTriggerReminders = () => {
    startTransition(async () => {
      const res = await triggerPaymentReminders();
      setReminderResult({
        success: res.success,
        message: res.message,
      });
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllManagementNotificationsAsRead();
    });
  };

  const handleMarkSingle = (id: string) => {
    startTransition(async () => {
      await markManagementNotificationAsRead(id);
    });
  };

  const handleSendCustom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await sendCustomNotification(formData);
      if (res.success) {
        setSendResult("Notification delivered to driver.");
        form.reset();
        setTimeout(() => {
          setShowSendModal(false);
          setSendResult(null);
        }, 1500);
      } else {
        setSendResult(res.error || "Failed to deliver notification.");
      }
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "driver_onboarding_submitted":
        return <UserCheck className="h-5 w-5 text-blue-600" />;
      case "emergency_reported":
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case "maintenance_reported":
        return <Wrench className="h-5 w-5 text-amber-600" />;
      case "payment_proof_submitted":
      case "payment_overdue":
        return <DollarSign className="h-5 w-5 text-emerald-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-neutral-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-neutral-900">
              Operational Alerts & Dispatch
            </h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Real-time feed of fleet emergencies, maintenance requests, onboarding events, and automated driver payment reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="dispatch-reminders-btn"
            type="button"
            disabled={isPending}
            onClick={handleTriggerReminders}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Run Payment Reminders Check
          </button>

          <button
            id="open-send-modal-btn"
            type="button"
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            <Send className="h-4 w-4" />
            Message Driver
          </button>

          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              type="button"
              disabled={isPending}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Reminder execution feedback */}
      {reminderResult && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm ${
            reminderResult.success
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {reminderResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span>{reminderResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setReminderResult(null)}
            className="text-xs font-semibold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex gap-2">
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "all"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            id="filter-unread-btn"
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "unread"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        <span className="text-xs text-neutral-500">
          Showing {filteredNotifications.length} items
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-3 text-sm font-medium text-neutral-900">
              No notifications matching your filter
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Operational updates and reminder alerts will appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition ${
                notif.is_read
                  ? "border-neutral-200 bg-white"
                  : "border-blue-200 bg-blue-50/40 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-neutral-200 bg-white p-2">
                  {getTypeIcon(notif.type)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-neutral-900">
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        New
                      </span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {new Date(notif.created_at).toLocaleString("en-ZA")}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-neutral-600">{notif.body}</p>

                  {notif.driver_profile_id && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                      <span>
                        Driver:{" "}
                        <strong className="text-neutral-700">
                          {notif.driver_name || "Unknown"}
                        </strong>
                      </span>
                      {notif.driver_phone && <span>• {notif.driver_phone}</span>}
                      <Link
                        href={`/management/drivers/${notif.driver_profile_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Driver Workspace →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!notif.is_read && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleMarkSingle(notif.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Direct In-App Message Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-semibold text-neutral-900">
                Send Direct In-App Alert to Driver
              </h3>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCustom} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="recipientProfileId"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Select Driver
                </label>
                <select
                  id="recipientProfileId"
                  name="recipientProfileId"
                  required
                  className="w-full rounded-lg border border-neutral-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">-- Choose a registered driver --</option>
                  {driverOptions.map((d) => (
                    <option key={d.profile_id} value={d.profile_id}>
                      {d.full_name || "Unnamed Driver"} ({d.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="notifType"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Notification Category
                </label>
                <select
                  id="notifType"
                  name="type"
                  className="w-full rounded-lg border border-neutral-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="management_alert">Operational Alert</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="maintenance_notice">Maintenance Notice</option>
                  <option value="contract_update">Contract Update</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="notifTitle"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Title / Subject
                </label>
                <input
                  id="notifTitle"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Schedule Safety Inspection"
                  className="w-full rounded-lg border border-neutral-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="notifBody"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Message Body
                </label>
                <textarea
                  id="notifBody"
                  name="body"
                  required
                  rows={3}
                  placeholder="Detailed message delivered to driver's dashboard..."
                  className="w-full rounded-lg border border-neutral-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {sendResult && (
                <p className="text-xs font-medium text-neutral-800">{sendResult}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send In-App Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
