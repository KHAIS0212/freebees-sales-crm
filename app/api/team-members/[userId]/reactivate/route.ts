import { NextResponse } from "next/server";

import { getActiveAdminClient } from "@/lib/activities/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// POST /api/team-members/[userId]/reactivate
// Reactivate an existing team membership without changing its role.
export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;

    // Validate the target ID before using it in a query.
    const { z } = await import("zod");
    const idValidation = z.string().uuid().safeParse(userId);

    if (!idValidation.success) {
      return jsonResponse(
        { error: "A valid user ID is required." },
        400,
      );
    }

    const adminSupabase = createAdminClient();

    const { data: member, error: lookupError } = await adminSupabase
      .from("team_members")
      .select("user_id, full_name, role, is_active, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) {
      console.error("Team member lookup failed:", lookupError.code);

      return jsonResponse(
        { error: "Unable to retrieve the team member." },
        500,
      );
    }

    if (!member) {
      return jsonResponse(
        { error: "Team member not found." },
        404,
      );
    }

    if (member.is_active) {
      return jsonResponse(
        {
          message: "The member is already active.",
          data: member,
        },
        200,
      );
    }

    const { data, error } = await adminSupabase
      .from("team_members")
      .update({ is_active: true })
      .eq("user_id", userId)
      .eq("is_active", false)
      .select("user_id, full_name, role, is_active, created_at")
      .maybeSingle();

    if (error) {
      console.error("Team member reactivation failed:", error.code);

      return jsonResponse(
        { error: "Unable to reactivate the team member." },
        500,
      );
    }

    if (!data) {
      return jsonResponse(
        {
          error:
            "The member could not be reactivated. Refresh the team list and try again.",
        },
        409,
      );
    }

    return jsonResponse(
      {
        message: "Team member reactivated successfully.",
        data,
      },
      200,
    );
  } catch (error) {
    console.error(
      "POST team member reactivation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Unable to process the request." },
      500,
    );
  }
}