
import { Mail, MessageCircle, MoreHorizontal } from "lucide-react";

import type { SalesActivity } from "@/features/activities/activity.types";
import { formatDate } from "@/lib/utils/formatters";
import { typeLabel } from "@/features/activities/activity.utils";
import { StatusBadge } from "@/components/activities/status-badge";
import { TypeIcon } from "@/components/activities/type-icon";

type ActivityListMobileProps = {
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

export function ActivityListMobile({
  activities,
  userRole,
  onSelectNote,
  onOpenActivityMenu,
}: ActivityListMobileProps) {
  return (
    <div className="divide-y divide-[var(--border)] md:hidden">
      {activities.map((activity) => (
        <article key={activity.id} className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="break-words font-semibold">
                {activity.customer_name}
              </h4>

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

              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                <TypeIcon type={activity.activity_type} />
                {typeLabel(activity.activity_type)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={activity.status} />

              {userRole === "admin" && (
                <button
                  type="button"
                  aria-label={`Actions for ${activity.customer_name}`}
                  aria-haspopup="menu"
                  onClick={(event) => onOpenActivityMenu(event, activity)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[#9F1239]"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {activity.notes && (
            <button
              type="button"
              onClick={() =>
                onSelectNote({
                  customerName: activity.customer_name,
                  notes: activity.notes,
                })
              }
              className="line-clamp-2 w-full cursor-pointer break-words whitespace-pre-wrap text-left text-sm leading-6 text-[var(--muted)] hover:text-[#9F1239]"
              aria-label={`Read full notes for ${activity.customer_name}`}
              title="Tap to read the full note"
            >
              {activity.notes}
            </button>
          )}

          <p className="text-xs text-[var(--muted)]">
            {formatDate(activity.created_at)}
          </p>
        </article>
      ))}
    </div>
  );
}
