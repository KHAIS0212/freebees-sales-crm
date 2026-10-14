
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


export async function GET(request: Request) {
request.headers.get("cookie");

  try {
    // Ensure this endpoint uses the incoming request's session.

    const supabase = await createClient();

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (
      claimsError ||
      typeof userId !== "string" ||
      userId.length === 0
    ) {
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

    // Retrieve only the current user's team membership.
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      console.error(
        "Session membership verification failed:",
        memberError.message,
      );

      return NextResponse.json(
        { error: "Unable to verify team membership." },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (!member || !member.is_active) {
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

    return NextResponse.json(
      {
        authenticated: true,
        role: member.role,
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
