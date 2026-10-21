
import { connection, NextRequest, NextResponse } from "next/server";

import { getActiveTeamClient } from "@/lib/activities/auth";
import { apiError } from "@/lib/api/responses";

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 10;

export async function GET(request: NextRequest) {
  await connection();

  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      return access.response;
    }

    const query = (
      request.nextUrl.searchParams.get("q") ?? ""
    ).trim();

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { customers: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return apiError("Search query is too long.", 400);
    }

    // Search brand names only.
    const { data: brands, error: brandError } = await access.supabase
      .from("customer_brands")
      .select("id, name")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(MAX_RESULTS);

    if (brandError) {
      console.error("Brand search failed:", brandError.message);
      return apiError("Unable to search customers.", 500);
    }

    const brandIds = (brands ?? []).map((brand) => brand.id);

    if (brandIds.length === 0) {
      return NextResponse.json(
        { customers: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Retrieve branches belonging to the matching brands.
    const { data: branches, error: branchError } = await access.supabase
      .from("customers")
      .select("id, name, location, phone, email, brand_id")
      .in("brand_id", brandIds)
      .order("name")
      .limit(MAX_RESULTS);

    if (branchError) {
      console.error("Branch lookup failed:", branchError.message);
      return apiError("Unable to search customers.", 500);
    }

    const brandNames = new Map(
      (brands ?? []).map((brand) => [brand.id, brand.name]),
    );

    return NextResponse.json(
      {
        customers: (branches ?? []).map((branch) => ({
          id: branch.id,
          name: branch.name,
          location: branch.location,
          phone: branch.phone,
          email: branch.email,
          brandId: branch.brand_id,
          brandName: brandNames.get(branch.brand_id) ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Customer search request failed:", error);
    return apiError("Unable to search customers.", 500);
  }
}
