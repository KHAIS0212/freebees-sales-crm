
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getActiveAdminClient } from "@/lib/activities/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const userIdSchema = z.string().uuid();

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

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

async function getTargetMember(userId: string) {
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("team_members")
    .select("user_id, full_name, role, is_active, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Team member lookup failed:",
      error.code,
    );

    return {
      ok: false as const,
      status: 500,
      error: "Unable to retrieve the team member.",
    };
  }

  if (!data) {
    return {
      ok: false as const,
      status: 404,
      error: "Team member not found.",
    };
  }

  return {
    ok: true as const,
    member: data,
    adminSupabase,
  };
}

async function getActiveAdminCount(
  adminSupabase: ReturnType<typeof createAdminClient>,
) {
  return adminSupabase
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);
}

// PATCH /api/team-members/[userId]
// Change a member's role.
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const idValidation = userIdSchema.safeParse(userId);

    if (!idValidation.success) {
      return jsonResponse(
        { error: "A valid user ID is required." },
        400,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Request body must contain valid JSON." },
        400,
      );
    }

    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return jsonResponse(
        {
          error: "A valid role is required.",
          details: validation.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const target = await getTargetMember(userId);

    if (!target.ok) {
      return jsonResponse(
        { error: target.error },
        target.status,
      );
    }

    const { member, adminSupabase } = target;

    if (member.role === validation.data.role) {
      return jsonResponse(
        {
          message: "The member already has this role.",
          data: member,
        },
        200,
      );
    }

    // Protect the last active administrator from demotion.
    if (
      member.role === "admin" &&
      member.is_active &&
      validation.data.role !== "admin"
    ) {
      const { count, error } =
        await getActiveAdminCount(adminSupabase);

      if (error) {
        console.error(
          "Active administrator count failed:",
          error.code,
        );

        return jsonResponse(
          { error: "Unable to verify administrator access." },
          500,
        );
      }

      if (count === null) {
        return jsonResponse(
          { error: "Unable to verify administrator access." },
          500,
        );
      }

      if (count <= 1) {
        return jsonResponse(
          {
            error:
              "The last active administrator cannot be demoted.",
          },
          409,
        );
      }
    }

    const { data, error } = await adminSupabase
      .from("team_members")
      .update({ role: validation.data.role })
      .eq("user_id", userId)
      .select("user_id, full_name, role, is_active, created_at")
      .maybeSingle();

    if (error) {
      console.error(
        "Team member role update failed:",
        error.code,
      );

      return jsonResponse(
        { error: "Unable to update the member's role." },
        500,
      );
    }

    if (!data) {
      return jsonResponse(
        { error: "Team member not found." },
        404,
      );
    }

    return jsonResponse(
      {
        message: "Team member role updated successfully.",
        data,
      },
      200,
    );
  } catch (error) {
    console.error(
      "PATCH team member failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Unable to process the request." },
      500,
    );
  }
}

// DELETE /api/team-members/[userId]
// Deactivate a member without deleting their Auth account.
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    const { userId } = await context.params;
    const idValidation = userIdSchema.safeParse(userId);

    if (!idValidation.success) {
      return jsonResponse(
        { error: "A valid user ID is required." },
        400,
      );
    }

    // Prevent an administrator from deactivating their own account.
    if (access.member.user_id === userId) {
      return jsonResponse(
        {
          error:
            "You cannot deactivate your own team membership.",
        },
        409,
      );
    }

    const target = await getTargetMember(userId);

    if (!target.ok) {
      return jsonResponse(
        { error: target.error },
        target.status,
      );
    }

    const { member, adminSupabase } = target;

    if (!member.is_active) {
      return jsonResponse(
        {
          message: "The member is already inactive.",
          data: member,
        },
        200,
      );
    }

    // Protect the last active administrator from deactivation.
    if (member.role === "admin") {
      const { count, error } =
        await getActiveAdminCount(adminSupabase);

      if (error) {
        console.error(
          "Active administrator count failed:",
          error.code,
        );

        return jsonResponse(
          { error: "Unable to verify administrator access." },
          500,
        );
      }

      if (count === null) {
        return jsonResponse(
          { error: "Unable to verify administrator access." },
          500,
        );
      }

      if (count <= 1) {
        return jsonResponse(
          {
            error:
              "The last active administrator cannot be deactivated.",
          },
          409,
        );
      }
    }

    const { data, error } = await adminSupabase
      .from("team_members")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true)
      .select("user_id, full_name, role, is_active, created_at")
      .maybeSingle();

    if (error) {
      console.error(
        "Team member deactivation failed:",
        error.code,
      );

      return jsonResponse(
        { error: "Unable to deactivate the team member." },
        500,
      );
    }

    if (!data) {
      return jsonResponse(
        {
          error:
            "The member could not be deactivated. Refresh the team list and try again.",
        },
        409,
      );
    }

    return jsonResponse(
      {
        message: "Team member deactivated successfully.",
        data,
      },
      200,
    );
  } catch (error) {
    console.error(
      "DELETE team member failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Unable to process the request." },
      500,
    );
  }
}
