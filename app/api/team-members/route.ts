
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getActiveAdminClient } from "@/lib/activities/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const createTeamMemberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(12, "Temporary password must contain at least 12 characters.")
    .max(128, "Temporary password cannot exceed 128 characters."),

  role: z.enum(["admin", "member"]),
});

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


export async function GET() {
  try {
    // Only active administrators can list team members.
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    const adminSupabase = createAdminClient();

    // Retrieve team membership records.
    const { data: members, error: membersError } = await adminSupabase
      .from("team_members")
      .select("user_id, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error(
        "Team member listing failed:",
        membersError.code,
      );

      return jsonResponse(
        { error: "Unable to retrieve team members." },
        500,
      );
    }

    const teamMembers = members ?? [];

    // Avoid Auth API requests when the team is empty.
    if (teamMembers.length === 0) {
      return jsonResponse({ data: [] }, 200);
    }

    // Only collect emails for accounts present in the team.
    const teamUserIds = new Set(
      teamMembers.map((member) => member.user_id),
    );

    const emailByUserId = new Map<string, string>();

    // Supabase Auth lists users in pages. Stop once all team
    // accounts are found or there are no more Auth users.
    const perPage = 1000;
    let page = 1;

    while (emailByUserId.size < teamUserIds.size) {
      const { data: authData, error: authError } =
        await adminSupabase.auth.admin.listUsers({
          page,
          perPage,
        });

      if (authError) {
        console.error(
          "Team member email lookup failed:",
          authError.code,
        );

        return jsonResponse(
          { error: "Unable to retrieve team member email addresses." },
          500,
        );
      }

      const authUsers = authData.users;

      for (const user of authUsers) {
        if (
          teamUserIds.has(user.id) &&
          user.email
        ) {
          emailByUserId.set(user.id, user.email);
        }
      }

      // No more Auth users to examine.
      if (authUsers.length < perPage) {
        break;
      }

      page += 1;
    }

    // Return only the fields required by the Team Management UI.
    const data = teamMembers.map((member) => ({
      ...member,
      email: emailByUserId.get(member.user_id) ?? null,
    }));

    return jsonResponse({ data }, 200);
  } catch (error) {
    console.error(
      "GET team members failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Unable to process the request." },
      500,
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    // Authenticate the caller and require active admin membership.
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
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

    const validation = createTeamMemberSchema.safeParse(body);

    if (!validation.success) {
      return jsonResponse(
        {
          error: "Please check the submitted member details.",
          details: validation.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const { full_name, email, password, role } = validation.data;

    const adminSupabase = createAdminClient();

    // Create the Supabase Auth account.
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

    if (authError || !authData.user) {
      if (
        authError?.code === "email_exists" ||
        authError?.code === "user_already_exists"
      ) {
        return jsonResponse(
          { error: "An account with this email may already exist." },
          409,
        );
      }

      console.error(
        "Team account creation failed:",
        authError?.code ?? "No user returned",
      );

      return jsonResponse(
        { error: "Unable to create the team account." },
        500,
      );
    }

    const userId = authData.user.id;

    // Add the new account to the CRM team.
    const { error: membershipError } = await adminSupabase
      .from("team_members")
      .insert({
        user_id: userId,
        full_name,
        role,
        is_active: true,
      });

    if (membershipError) {
      console.error(
        "Team membership creation failed:",
        membershipError.code,
      );

      // Clean up the Auth account if membership insertion fails.
      const { error: cleanupError } =
        await adminSupabase.auth.admin.deleteUser(userId);

      if (cleanupError) {
        console.error(
          "Team account cleanup failed:",
          cleanupError.message,
        );
      }

      return jsonResponse(
        {
          error:
            "Unable to finish team membership creation. Check the team records before retrying.",
        },
        500,
      );
    }

    return jsonResponse(
      {
        message: "Team member created successfully.",
        data: {
          user_id: userId,
          full_name,
          email,
          role,
          is_active: true,
        },
      },
      201,
    );
  } catch (error) {
    console.error(
      "POST team members failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse(
      { error: "Unable to process the request." },
      500,
    );
  }
}
