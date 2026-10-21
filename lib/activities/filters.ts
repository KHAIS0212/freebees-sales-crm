
export type ActivityFilters = {
  limit: number;
  offset: number;
  search: string;
  status: string;
  activityType: string;
  from: string;
  to: string;
};

export type ActivityFilterParseResult =
  | {
      ok: true;
      filters: ActivityFilters;
    }
  | {
      ok: false;
      message: string;
    };

const VALID_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FOLLOW_UP_REQUIRED",
];

const VALID_ACTIVITY_TYPES = [
  "CALL",
  "RESTAURANT_VISIT",
  "MEETING",
  "EMAIL",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function parseActivityFilters(
  searchParams: URLSearchParams,
): ActivityFilterParseResult {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");

  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const activityType = searchParams.get("activityType") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const limit = rawLimit === null ? 20 : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    return {
      ok: false,
      message:
        "Limit must be 1–100 and offset must be a non-negative integer.",
    };
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return {
      ok: false,
      message: "Invalid activity status filter.",
    };
  }

  if (
    activityType &&
    !VALID_ACTIVITY_TYPES.includes(activityType)
  ) {
    return {
      ok: false,
      message: "Invalid activity type filter.",
    };
  }

  if (
    (from && !isValidDate(from)) ||
    (to && !isValidDate(to))
  ) {
    return {
      ok: false,
      message: "Date filters must use valid YYYY-MM-DD dates.",
    };
  }

  if (from && to && from > to) {
    return {
      ok: false,
      message:
        "The start date must be on or before the end date.",
    };
  }

  return {
    ok: true,
    filters: {
      limit,
      offset,
      search,
      status,
      activityType,
      from,
      to,
    },
  };
}
