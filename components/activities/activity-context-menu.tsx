
import { Check, Trash2 } from "lucide-react";

import type { ActivityStatus, SalesActivity } from "@/features/activities/activity.types";
import { ACTIVITY_STATUSES } from "@/features/activities/activity.constants";

type ActivityContextMenuProps = {
  activity: SalesActivity;
  x: number;
  y: number;
  actingActivityId: string | null;
  onClose: () => void;
  onChangeStatus: (status: ActivityStatus) => void;
  onDelete: () => void;
};

export function ActivityContextMenu({
  activity,
  x,
  y,
  actingActivityId,
  onClose,
  onChangeStatus,
  onDelete,
}: ActivityContextMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close activity menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />

      <div
        role="menu"
        aria-label={`Actions for ${activity.customer_name}`}
        className="fixed z-50 min-w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-xl"
        style={{
          left: Math.min(
            x,
            (typeof window !== "undefined" ? window.innerWidth : 1024) - 220,
          ),
          top: Math.min(
            y,
            (typeof window !== "undefined" ? window.innerHeight : 768) - 230,
          ),
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Change status
        </p>

        {ACTIVITY_STATUSES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="menuitem"
            disabled={
              actingActivityId !== null || activity.status === item.value
            }
            onClick={() => onChangeStatus(item.value)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[#FFF1F2] disabled:cursor-default disabled:opacity-45"
          >
            <span>{item.label}</span>

            {activity.status === item.value && (
              <Check className="h-4 w-4 text-[#9F1239]" />
            )}
          </button>
        ))}

        <div className="my-1 border-t border-[var(--border)]" />

        <button
          type="button"
          role="menuitem"
          disabled={actingActivityId !== null}
          onClick={onDelete}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete activity
        </button>
      </div>
    </>
  );
}
