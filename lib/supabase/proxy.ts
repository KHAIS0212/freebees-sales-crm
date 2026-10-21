
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isProtectedPage =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/activities";

  if (error || typeof userId !== "string" || !userId) {
    if (isProtectedPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";

      return NextResponse.redirect(loginUrl);
    }

    return response;
  }
  if (isProtectedPage || isLoginPage) {
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error(
      "Proxy membership verification failed:",
      memberError.message,
    );

    return NextResponse.json(
      { error: "Unable to verify team membership." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (!member || !member.is_active) {
    if (isProtectedPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "?access=denied";

      return NextResponse.redirect(loginUrl);
    }

    return response;
  }
}

  if (isLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";

    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/", "/activities", "/login"],
};
