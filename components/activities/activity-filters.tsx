
import { ChevronDown, RotateCcw, Search } from "lucide-react";

import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
} from "@/features/activities/activity.constants";

type ActivityFiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  activityTypeFilter: string;
  onActivityTypeFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  debouncedSearchTerm: string;
};

export function ActivityFilters({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  activityTypeFilter,
  onActivityTypeFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  debouncedSearchTerm,
}: ActivityFiltersProps) {
  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(debouncedSearchTerm) ||
    statusFilter !== "ALL" ||
    activityTypeFilter !== "ALL" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  function clearFilters() {
    onSearchTermChange("");
    onStatusFilterChange("ALL");
    onActivityTypeFilterChange("ALL");
    onDateFromChange("");
    onDateToChange("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

          <input
            type="search"
            aria-label="Search activities"
            placeholder="Search customers or notes"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="crm-input crm-input-search"
          />
        </div>

        <div className="relative min-w-0">
          <select
            aria-label="Filter activities by status"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="crm-input appearance-none pr-10"
          >
            <option value="ALL">All statuses</option>
            {ACTIVITY_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        </div>

        <div className="relative min-w-0">
          <select
            aria-label="Filter activities by type"
            value={activityTypeFilter}
            onChange={(event) =>
              onActivityTypeFilterChange(event.target.value)
            }
            className="crm-input appearance-none pr-10"
          >
            <option value="ALL">All activity types</option>
            {ACTIVITY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        </div>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <RotateCcw className="h-4 w-4" />
          Clear filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--muted)]">
          Created from
          <input
            type="date"
            aria-label="Filter activities from date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="crm-input"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--muted)]">
          Created to
          <input
            type="date"
            aria-label="Filter activities to date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateToChange(event.target.value)}
            className="crm-input"
          />
        </label>
      </div>
    </div>
  );
}
