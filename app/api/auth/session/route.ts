
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { getActiveTeamClient } from "@/lib/activities/auth";

export async function GET() {
  await connection();

  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      if (access.response.status === 401) {
        return NextResponse.json(
          {
            authenticated: false,
            error: "Authentication required.",
          },
          {
            status: 401,
            headers: { "Cache-Control": "no-store" },
          },
        );
      }

      if (access.response.status === 403) {
        return NextResponse.json(
          {
            authenticated: true,
            error: "Active team membership required.",
          },
          {
            status: 403,
            headers: { "Cache-Control": "no-store" },
          },
        );
      }

      return access.response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        role: access.member.role,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "Session endpoint failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      { error: "Unable to verify the session." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
