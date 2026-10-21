
import { NextResponse } from "next/server";
import { getActiveTeamClient } from "@/lib/activities/auth";
import { connection } from "next/server";
type TrendRange =
  | "7d"
  | "30d"
  | "6m"
  | "9m"
  | "1y"
  | "2y"
  | "3y"
  | "4y"
  | "5y";

type Granularity = "day" | "month";

type TrendRow = {
  period_start: string;
  activity_count: number | string;
};

type TrendPoint = {
  date: string;
  count: number;
};

const MONTHS_BY_RANGE: Partial<Record<TrendRange, number>> = {
  "6m": 6,
  "9m": 9,
  "1y": 12,
  "2y": 24,
  "3y": 36,
  "4y": 48,
  "5y": 60,
};

const VALID_RANGES = new Set<TrendRange>([
  "7d", "30d", "6m", "9m", "1y", "2y", "3y", "4y", "5y",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getRangeDates(range: TrendRange) {
  const now = new Date();
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;

    return {
      startDate: addUtcDays(endDate, -(days - 1)),
      endDate,
      granularity: "day" as Granularity,
    };
  }

  const months = MONTHS_BY_RANGE[range];

  if (!months) {
    throw new Error("Unsupported trend range.");
  }

  // Return exactly the requested number of calendar-month buckets,
  // including the current month.
  const startDate = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth() - (months - 1),
      1,
    ),
  );

  return {
    startDate,
    endDate,
    granularity: "month" as Granularity,
  };
}

function buildTrend(
  rows: TrendRow[],
  startDate: Date,
  endDate: Date,
  granularity: Granularity,
): TrendPoint[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const count = Number(row.activity_count);

    if (
      !row.period_start ||
      !Number.isSafeInteger(count) ||
      count < 0
    ) {
      continue;
    }

    counts.set(row.period_start, count);
  }

  let cursor = new Date(startDate);

  if (granularity === "month") {
    cursor = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        1,
      ),
    );
  }

  const points: TrendPoint[] = [];

  while (cursor <= endDate) {
    const key = dayKey(cursor);

    points.push({
      date: key,
      count: counts.get(key) ?? 0,
    });

    if (granularity === "day") {
      cursor = addUtcDays(cursor, 1);
    } else {
      cursor = new Date(
        Date.UTC(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + 1,
          1,
        ),
      );
    }
  }

  return points;
}

export async function GET(request: Request) {
    await connection();
  const requestId = crypto.randomUUID();
  const requestStart = performance.now();

  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      return access.response;
    }

    const requestedRange = new URL(request.url).searchParams.get("range");

    if (
      !requestedRange ||
      !VALID_RANGES.has(requestedRange as TrendRange)
    ) {
      return jsonError("Invalid trend range.", 400);
    }

    const range = requestedRange as TrendRange;
    const { startDate, endDate, granularity } = getRangeDates(range);

    const { data, error } = await access.supabase.rpc(
      "get_activity_trend",
      {
        p_start_date: dayKey(startDate),
        p_end_date: dayKey(endDate),
        p_granularity: granularity,
      },
    );

    if (error || !Array.isArray(data)) {
      console.error(
        `[Dashboard trend ${requestId}] Trend query failed:`,
        error?.message ?? "No data returned",
      );

      return jsonError("Unable to retrieve activity trend.", 500);
    }

    const dailyActivityCounts = buildTrend(
      data as TrendRow[],
      startDate,
      endDate,
      granularity,
    );

    console.log(
      `[Dashboard trend ${requestId}] Range=${range}, granularity=${granularity}, duration=${(performance.now() - requestStart).toFixed(2)} ms`,
    );

    return NextResponse.json(
      {
        data: {
          dailyActivityCounts,
          trendRange: range,
          trendGranularity: granularity,
          trendStartDate: dayKey(startDate),
          trendEndDate: dayKey(endDate),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      `[Dashboard trend ${requestId}] Unexpected error:`,
      error,
    );

    return jsonError("An unexpected error occurred.", 500);
  }
}
