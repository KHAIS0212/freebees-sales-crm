
import { Activity, Search } from "lucide-react";

type ActivityEmptyStateProps = {
  hasNoActivities: boolean;
  matchingActivityCount: number;
  debouncedSearchTerm: string;
  statusFilter: string;
};

export function ActivityEmptyState({
  hasNoActivities,
  matchingActivityCount,
}: ActivityEmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-4 rounded-2xl bg-[var(--hover)] p-4 text-[var(--muted)]">
        {matchingActivityCount === 0 ? (
          <Activity className="h-7 w-7" />
        ) : (
          <Search className="h-7 w-7" />
        )}
      </div>

      <h4 className="font-semibold">
        {hasNoActivities
          ? "No activities yet"
          : "No matching activities"}
      </h4>

      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
        {hasNoActivities
          ? "Start by recording your first customer interaction. Your saved activities will appear here."
          : "Try another search term or adjust your status, activity type, or date filters."}
      </p>
    </div>
  );
}
