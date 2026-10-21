
import { Mail, MessageCircle, MoreHorizontal } from "lucide-react";

import type { SalesActivity } from "@/features/activities/activity.types";
import { formatDate } from "@/lib/utils/formatters";
import { typeLabel } from "@/features/activities/activity.utils";
import { StatusBadge } from "@/components/activities/status-badge";
import { TypeIcon } from "@/components/activities/type-icon";

type ActivityTableProps = {
  activities: SalesActivity[];
  userRole: string | null;
  onSelectNote: (note: {
    customerName: string;
    notes: string;
  }) => void;
  onOpenActivityMenu: (
    event: React.MouseEvent<HTMLButtonElement>,
    activity: SalesActivity,
  ) => void;
};

export function ActivityTable({
  activities,
  userRole,
  onSelectNote,
  onOpenActivityMenu,
}: ActivityTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--hover)] text-xs uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-6 py-4 font-medium">Customer</th>
            <th className="px-6 py-4 font-medium">Activity</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Notes</th>
            <th className="px-6 py-4 font-medium">Created</th>
            {userRole === "admin" && (
              <th className="px-4 py-4 text-right font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border)]">
          {activities.map((activity) => (
            <tr
              key={activity.id}
              className="transition hover:bg-[var(--hover)]"
            >
              <td className="px-6 py-4">
                <div className="min-w-0">
                  <span className="font-medium">
                    {activity.customer_name}
                  </span>

                  {activity.customer_phone && (
                    <a
                      href={`tel:${activity.customer_phone}`}
                      className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[#9F1239]"
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      {activity.customer_phone}
                    </a>
                  )}

                  {activity.customer_email && (
                    <a
                      href={`mailto:${activity.customer_email}`}
                      className="mt-1 flex items-center gap-1.5 break-all text-xs text-[var(--muted)] hover:text-[#9F1239]"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {activity.customer_email}
                    </a>
                  )}
                </div>
              </td>

              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                  <TypeIcon type={activity.activity_type} />
                  {typeLabel(activity.activity_type)}
                </span>
              </td>

              <td className="px-6 py-4">
                <StatusBadge status={activity.status} />
              </td>

              <td className="max-w-64 px-6 py-4 text-[var(--muted)]">
                {activity.notes ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectNote({
                        customerName: activity.customer_name,
                        notes: activity.notes,
                      })
                    }
                    className="line-clamp-2 w-full cursor-pointer whitespace-pre-wrap break-words text-left underline-offset-2 hover:text-[#9F1239] hover:underline"
                    aria-label={`Read full notes for ${activity.customer_name}`}
                    title="Click to read the full note"
                  >
                    {activity.notes}
                  </button>
                ) : (
                  <span>—</span>
                )}
              </td>

              <td className="whitespace-nowrap px-6 py-4 text-xs text-[var(--muted)]">
                {formatDate(activity.created_at)}
              </td>

              {userRole === "admin" && (
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    aria-label={`Actions for ${activity.customer_name}`}
                    aria-haspopup="menu"
                    onClick={(event) =>
                      onOpenActivityMenu(event, activity)
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[#9F1239]"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
