import { NextRequest, NextResponse } from "next/server";
import {
  activitySchema,
  updateActivitySchema,
  activityIdSchema,
} from "@/lib/activities/validations";
import { parseActivityFilters } from "@/lib/activities/filters";
import {
  getActiveTeamClient,
  getActiveAdminClient,
} from "@/lib/activities/auth";
import { apiError } from "@/lib/api/responses";
import { findOrCreateCustomer } from "@/lib/activities/customer";
import { queryActivities } from "@/lib/activities/queries";
import {
  updateActivity,
  deleteActivity,
  createActivity,
} from "@/lib/activities/mutations";

export async function GET(request: NextRequest) {
  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      return access.response;
    }

    const parsed = parseActivityFilters(request.nextUrl.searchParams);

    if (!parsed.ok) {
      return apiError(parsed.message, 400);
    }

    const result = await queryActivities(access.supabase, parsed.filters);

    if (!result.ok) {
      return apiError(result.message, 500);
    }

    return NextResponse.json(
      {
        data: result.data,
        pagination: {
          limit: result.limit,
          offset: result.offset,
          total: result.total,
          hasMore: result.offset + result.data.length < result.total,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "GET activities failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return apiError("Unable to process the request.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await getActiveTeamClient();

    if (!access.ok) {
      return access.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return apiError("Request body must contain valid JSON.", 400, false);
    }

    const validation = activitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Please check the submitted activity details.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const activity = validation.data;
    const customerName = activity.customerName.trim();
    const customerPhone = activity.customerPhone.trim();
    const customerEmail = activity.customerEmail.trim().toLowerCase();
    const customerLocation = activity.customerLocation.trim();

    const customerResult = await findOrCreateCustomer(
      access.supabase,
      customerName,
      customerPhone,
      customerEmail,
      {
        customerId: activity.customerId,
        brandId: activity.brandId,
        customerLocation,
        branchAction: activity.branchAction,
      },
    );

    if (!customerResult.ok) {
      if (customerResult.reason === "branch_choice_required") {
        return apiError(customerResult.message, 400, false);
      }

      return apiError(customerResult.message, 500);
    }

    const result = await createActivity(access.supabase, {
      customerId: customerResult.customerId,
      customerName,
      customerPhone,
      customerEmail,
      activityType: activity.activityType,
      status: activity.status,
      notes: activity.notes,
    });

    if (!result.ok) {
      return apiError("Unable to save the activity.", 500, false);
    }

    return NextResponse.json(
      {
        message: "Activity created successfully.",
        data: result.data,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "POST activities failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return apiError("Unable to process the request.", 500, false);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return apiError("Request body must contain valid JSON.", 400, false);
    }

    const validation = updateActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Please check the submitted activity details.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const activity = validation.data;

    const updates = {
      ...(activity.customerName !== undefined
        ? { customer_name: activity.customerName }
        : {}),
      ...(activity.customerPhone !== undefined
        ? { customer_phone: activity.customerPhone }
        : {}),
      ...(activity.customerEmail !== undefined
        ? { customer_email: activity.customerEmail }
        : {}),
      ...(activity.activityType !== undefined
        ? { activity_type: activity.activityType }
        : {}),
      ...(activity.status !== undefined ? { status: activity.status } : {}),
      ...(activity.notes !== undefined ? { notes: activity.notes } : {}),
    };

    const result = await updateActivity(access.supabase, activity.id, updates);

    if (!result.ok) {
      if (result.reason === "database") {
        return apiError("Unable to update the activity.", 500);
      }

      return apiError("Activity not found or unavailable.", 404);
    }

    return NextResponse.json(
      {
        message: "Activity updated successfully.",
        data: result.data,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "PATCH activities failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return apiError("Unable to process the request.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await getActiveAdminClient();

    if (!access.ok) {
      return access.response;
    }

    const idValidation = activityIdSchema.safeParse(
      request.nextUrl.searchParams.get("id"),
    );

    if (!idValidation.success) {
      return apiError("A valid activity ID is required.", 400, false);
    }

    const result = await deleteActivity(access.supabase, idValidation.data);

    if (!result.ok) {
      if (result.reason === "database") {
        return apiError("Unable to delete the activity.", 500);
      }

      return apiError("Activity not found or unavailable.", 404);
    }

    return NextResponse.json(
      {
        message: "Activity deleted successfully.",
        data: { id: result.id },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "DELETE activities failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return apiError("Unable to process the request.", 500);
  }
}
