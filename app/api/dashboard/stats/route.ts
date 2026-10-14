import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

type ActivityTimestamp = { created_at: string };
type TrendPoint = { date: string; count: number };
type TrendRange = "7d" | "30d" | "all";

function utcDayStart(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function buildTrend(timestamps: ActivityTimestamp[], range: TrendRange): TrendPoint[] {
  const now = new Date();

  if (range === "all") {
    const counts = new Map<string, number>();

    for (const row of timestamps) {
      const date = new Date(row.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = monthKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const earliest = timestamps
      .map((row) => new Date(row.created_at))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const firstMonth = earliest
      ? new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1))
      : currentMonth;

    const points: TrendPoint[] = [];
    const cursor = new Date(firstMonth);
    // Keep the chart bounded if a workspace has a very long history.
    const maxMonths = 120;
    const monthDiff =
      (currentMonth.getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
      currentMonth.getUTCMonth() -
      cursor.getUTCMonth();

    if (monthDiff >= maxMonths) {
      cursor.setUTCMonth(cursor.getUTCMonth() - (maxMonths - 1));
    }

    while (cursor <= currentMonth) {
      const key = monthKey(cursor);
      points.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return points;
  }

  const days = range === "30d" ? 30 : 7;
  const today = utcDayStart(now);
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - (days - 1));

  const counts = new Map<string, number>();
  for (const row of timestamps) {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(utcDayStart(date));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(firstDay);
    date.setUTCDate(date.getUTCDate() + index);
    const key = dayKey(date);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

export async function GET(request: Request) {
  // Access request data so this cookie-dependent route remains request-rendered.
  request.headers.get("cookie");

  try {
    const supabase = await createClient();

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || typeof userId !== "string" || userId.length === 0) {
      return jsonError("Authentication required.", 401);
    }

    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("user_id, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error("Dashboard membership verification failed:", memberError);
      return jsonError("Unable to verify team membership.", 500);
    }

    if (!member || !member.is_active) {
      return jsonError("Active team membership required.", 403);
    }

    const requestedRange = new URL(request.url).searchParams.get("range");
    const range: TrendRange =
      requestedRange === "30d" || requestedRange === "all" ? requestedRange : "7d";

    const now = new Date();
    const today = utcDayStart(now);
    const firstDay = new Date(today);
    firstDay.setUTCDate(firstDay.getUTCDate() - (range === "30d" ? 29 : 6));

    let timestampsQuery = supabase.from("activities").select("created_at");
    if (range !== "all") {
      timestampsQuery = timestampsQuery.gte("created_at", firstDay.toISOString());
    }

    const [
      totalResult,
      pendingResult,
      completedResult,
      followUpResult,
      timestampsResult,
    ] = await Promise.all([
      supabase.from("activities").select("id", { count: "exact", head: true }),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING"),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED"),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("status", "FOLLOW_UP_REQUIRED"),
      timestampsQuery,
    ]);

    if (
      totalResult.error ||
      pendingResult.error ||
      completedResult.error ||
      followUpResult.error ||
      timestampsResult.error
    ) {
      console.error("Dashboard statistics query failed.");
      return jsonError("Unable to retrieve dashboard statistics.", 500);
    }

    const dailyActivityCounts = buildTrend(
      (timestampsResult.data ?? []) as ActivityTimestamp[],
      range,
    );

    return NextResponse.json(
      {
        data: {
          totalActivities: totalResult.count ?? 0,
          pendingActivities: pendingResult.count ?? 0,
          completedActivities: completedResult.count ?? 0,
          followUpsRequired: followUpResult.count ?? 0,
          dailyActivityCounts,
          trendRange: range,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unexpected dashboard statistics error:", error);
    return jsonError("An unexpected error occurred.", 500);
  }
}
