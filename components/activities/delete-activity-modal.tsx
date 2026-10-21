
import { LoaderCircle, Trash2 } from "lucide-react";

import type { SalesActivity } from "@/features/activities/activity.types";

type DeleteActivityModalProps = {
  activity: SalesActivity;
  actingActivityId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteActivityModal({
  activity,
  actingActivityId,
  onCancel,
  onConfirm,
}: DeleteActivityModalProps) {
  const isDeleting = actingActivityId === activity.id;
  const isActing = actingActivityId !== null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isActing) {
          onCancel();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-activity-title"
        aria-describedby="delete-activity-description"
        className="crm-card w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3
                id="delete-activity-title"
                className="text-lg font-semibold"
              >
                Delete activity?
              </h3>

              <p
                id="delete-activity-description"
                className="mt-2 text-sm leading-6 text-[var(--muted)]"
              >
                Are you sure you want to delete the activity for{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {activity.customer_name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            disabled={isActing}
            onClick={onCancel}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--hover)] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isActing}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}

            {isDeleting ? "Deleting..." : "Delete activity"}
          </button>
        </div>
      </section>
    </div>
  );
}
