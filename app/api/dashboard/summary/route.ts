
import { NextResponse } from "next/server";
import { getActiveTeamClient } from "@/lib/activities/auth";
import { queryLatestDashboardActivities } from "@/lib/activities/queries";
import { connection } from "next/server";
function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  await connection();
  const requestId = crypto.randomUUID();
  const requestStart = performance.now();

  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      return access.response;
    }

    const { supabase } = access;

    const [
      totalResult,
      pendingResult,
      completedResult,
      followUpResult,
      latestResult,
    ] = await Promise.all([
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true }),

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

      queryLatestDashboardActivities(supabase),
    ]);

    
const countResults = [
  totalResult,
  pendingResult,
  completedResult,
  followUpResult,
];

const countError =
  totalResult.error ??
  pendingResult.error ??
  completedResult.error ??
  followUpResult.error;

if (countError) {
  console.error(
    `[Dashboard summary ${requestId}] Count query failed:`,
    countError.message,
  );

  return jsonError(
    "Unable to retrieve dashboard statistics.",
    500,
  );
}


    if (!latestResult.ok) {
      console.error(
        `[Dashboard summary ${requestId}] Latest activities query failed:`,
        latestResult.stage,
        latestResult.message,
      );

      return jsonError("Unable to retrieve recent activities.", 500);
    }

    const counts = countResults.map((result) => result.count);

    if (
      counts.some(
        (count) =>
          typeof count !== "number" ||
          !Number.isSafeInteger(count) ||
          count < 0,
      )
    ) {
      return jsonError("Unable to retrieve dashboard statistics.", 500);
    }

    console.log(
      `[Dashboard summary ${requestId}] Completed in ${(performance.now() - requestStart).toFixed(2)} ms`,
    );

    return NextResponse.json(
      {
        data: {
          totalActivities: totalResult.count ?? 0,
          pendingActivities: pendingResult.count ?? 0,
          completedActivities: completedResult.count ?? 0,
          followUpsRequired: followUpResult.count ?? 0,
          latestActivities: latestResult.data,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      `[Dashboard summary ${requestId}] Unexpected error:`,
      error,
    );

    return jsonError("An unexpected error occurred.", 500);
  }
}
