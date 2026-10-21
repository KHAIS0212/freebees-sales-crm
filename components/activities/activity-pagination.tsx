
import { LoaderCircle } from "lucide-react";

type ActivityPaginationProps = {
  activityCount: number;
  matchingActivityCount: number;
  hasMoreActivities: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

export function ActivityPagination({
  activityCount,
  matchingActivityCount,
  hasMoreActivities,
  loadingMore,
  onLoadMore,
}: ActivityPaginationProps) {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
      <p className="text-xs text-[var(--muted)]">
        Showing {activityCount} of {matchingActivityCount} matching activities
      </p>

      {hasMoreActivities && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingMore ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load more"
          )}
        </button>
      )}
    </div>
  );
}
