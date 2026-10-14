import { NextRequest, NextResponse } from "next/server";



import { z } from "zod";



import { createClient } from "@/lib/supabase/server";



const activityFields = {



  customerName: z.string().trim().min(1).max(120),

  customerPhone: z.string().trim().max(30).default(""),

  customerEmail: z.string().trim().max(254).default("").refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address."),



  activityType: z.enum([



    "CALL",



    "RESTAURANT_VISIT",



    "MEETING",



    "EMAIL",



  ]),



  status: z.enum([



    "PENDING",



    "COMPLETED",



    "FOLLOW_UP_REQUIRED",



  ]),



  notes: z.string().max(2000),



};



const activitySchema = z.object({



  ...activityFields,



  notes: activityFields.notes.default(""),



});



const updateActivitySchema = z



  .object({



    id: z.string().uuid(),



    customerName: activityFields.customerName.optional(),

    customerPhone: z.string().trim().max(30).optional(),

    customerEmail: z.string().trim().max(254).optional().refine((value) => value === undefined || value === "" || z.string().email().safeParse(value).success, "Enter a valid email address."),



    activityType: activityFields.activityType.optional(),



    status: activityFields.status.optional(),



    notes: activityFields.notes.optional(),



  })



  .refine(



    (activity) =>



      activity.customerName !== undefined ||

      activity.customerPhone !== undefined ||

      activity.customerEmail !== undefined ||



      activity.activityType !== undefined ||



      activity.status !== undefined ||



      activity.notes !== undefined,



    {



      message: "Provide at least one field to update.",



    },



  );



const activityIdSchema = z.string().uuid();



const activityColumns =



  "id,customer_id,customer_name,customer_phone,customer_email,activity_type,status,notes,created_at";



async function getActiveTeamClient() {



  const supabase = await createClient();



  const { data: claimsData, error: claimsError } =



    await supabase.auth.getClaims();



  const userId = claimsData?.claims?.sub;



  if (



    claimsError ||



    typeof userId !== "string" ||



    userId.length === 0



  ) {



    return {



      ok: false as const,



      response: NextResponse.json(



        { error: "Authentication required." },



        {



          status: 401,



          headers: { "Cache-Control": "no-store" },



        },



      ),



    };



  }



  const { data: member, error: memberError } = await supabase



    .from("team_members")



    .select("user_id, role, is_active")



    .eq("user_id", userId)



    .maybeSingle();



  if (memberError) {



    console.error(



      "Team membership verification failed:",



      memberError.message,



    );



    return {



      ok: false as const,



      response: NextResponse.json(



        { error: "Unable to verify team membership." },



        {



          status: 500,



          headers: { "Cache-Control": "no-store" },



        },



      ),



    };



  }



  if (!member || !member.is_active) {



    return {



      ok: false as const,



      response: NextResponse.json(



        { error: "Active team membership required." },



        {



          status: 403,



          headers: { "Cache-Control": "no-store" },



        },



      ),



    };



  }



  return { ok: true as const, supabase, member };



}



async function getActiveAdminClient() {



  const access = await getActiveTeamClient();



  if (!access.ok) {



    return access;



  }



  if (access.member.role !== "admin") {



    return {



      ok: false as const,



      response: NextResponse.json(



        { error: "Administrator access required." },



        {



          status: 403,



          headers: { "Cache-Control": "no-store" },



        },



      ),



    };



  }



  return access;



}



export async function GET(request: NextRequest) {



  try {



    const access = await getActiveTeamClient();



    if (!access.ok) {



      return access.response;



    }



    const { searchParams } = request.nextUrl;



    const rawLimit = searchParams.get("limit");



    const rawOffset = searchParams.get("offset");



    const rawSearch = searchParams.get("q") ?? "";



    const rawStatus = searchParams.get("status") ?? "";



    const rawActivityType = searchParams.get("activityType") ?? "";



    const rawFrom = searchParams.get("from") ?? "";



    const rawTo = searchParams.get("to") ?? "";



    const parsedLimit = rawLimit === null ? 20 : Number(rawLimit);



    const parsedOffset = rawOffset === null ? 0 : Number(rawOffset);



    if (



      !Number.isInteger(parsedLimit) ||



      parsedLimit < 1 ||



      parsedLimit > 100 ||



      !Number.isInteger(parsedOffset) ||



      parsedOffset < 0



    ) {



      return NextResponse.json(



        { error: "Limit must be 1–100 and offset must be a non-negative integer." },



        {



          status: 400,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    const validStatuses = ["PENDING", "COMPLETED", "FOLLOW_UP_REQUIRED"];



    const validActivityTypes = ["CALL", "RESTAURANT_VISIT", "MEETING", "EMAIL"];



    const datePattern = /^\d{4}-\d{2}-\d{2}$/;



    if (rawStatus && !validStatuses.includes(rawStatus)) {



      return NextResponse.json(



        { error: "Invalid activity status filter." },



        { status: 400, headers: { "Cache-Control": "no-store" } },



      );



    }



    if (rawActivityType && !validActivityTypes.includes(rawActivityType)) {



      return NextResponse.json(



        { error: "Invalid activity type filter." },



        { status: 400, headers: { "Cache-Control": "no-store" } },



      );



    }



    const isValidDate = (value: string) => {



      if (!datePattern.test(value)) return false;



      const date = new Date(`${value}T00:00:00.000Z`);



      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;



    };



    if ((rawFrom && !isValidDate(rawFrom)) || (rawTo && !isValidDate(rawTo))) {



      return NextResponse.json(



        { error: "Date filters must use valid YYYY-MM-DD dates." },



        { status: 400, headers: { "Cache-Control": "no-store" } },



      );



    }



    if (rawFrom && rawTo && rawFrom > rawTo) {



      return NextResponse.json(



        { error: "The start date must be on or before the end date." },



        { status: 400, headers: { "Cache-Control": "no-store" } },



      );



    }



    // Restrict search text so it cannot alter the PostgREST OR-filter syntax.



    const searchTerm = rawSearch



      .replace(/[^a-zA-Z0-9\s-]/g, " ")



      .replace(/\s+/g, " ")



      .trim()



      .slice(0, 120);



    let query = access.supabase



      .from("activities")



      .select(activityColumns, { count: "exact" })



      .order("created_at", { ascending: false });



    if (searchTerm) {



      query = query.or(



        `customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`,



      );



    }



    if (rawStatus) {



      query = query.eq("status", rawStatus);



    }



    if (rawActivityType) {



      query = query.eq("activity_type", rawActivityType);



    }



    if (rawFrom) {



      query = query.gte("created_at", `${rawFrom}T00:00:00.000Z`);



    }



    if (rawTo) {



      const dayAfterTo = new Date(`${rawTo}T00:00:00.000Z`);



      dayAfterTo.setUTCDate(dayAfterTo.getUTCDate() + 1);



      query = query.lt("created_at", dayAfterTo.toISOString());



    }



    const { data, error, count } = await query.range(



      parsedOffset,



      parsedOffset + parsedLimit - 1,



    );



    if (error) {



      console.error("Activity retrieval failed:", error.message);



      return NextResponse.json(



        { error: "Unable to retrieve activities." },



        {



          status: 500,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    // Resolve contact fields from the linked customer record for legacy activities.
    const rawActivities = data ?? [];
    const customerIds = Array.from(
      new Set(
        rawActivities
          .map((activity) => activity.customer_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    let customerContacts = new Map<
      string,
      { phone: string | null; email: string | null }
    >();

    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await access.supabase
        .from("customers")
        .select("id,phone,email")
        .in("id", customerIds);

      if (customersError) {
        console.error("Customer contact lookup failed:", customersError.message);
        return NextResponse.json(
          { error: "Unable to retrieve customer contact details." },
          { status: 500, headers: { "Cache-Control": "no-store" } },
        );
      }

      customerContacts = new Map(
        (customers ?? []).map((customer) => [
          customer.id,
          { phone: customer.phone, email: customer.email },
        ]),
      );
    }

    const activities = rawActivities.map((activity) => {
      const customer = activity.customer_id
        ? customerContacts.get(activity.customer_id)
        : undefined;

      return {
        ...activity,
        customer_phone: customer?.phone || activity.customer_phone || null,
        customer_email: customer?.email || activity.customer_email || null,
      };
    });

    const total = count ?? 0;



    return NextResponse.json(



      {



        data: activities,



        pagination: {



          limit: parsedLimit,



          offset: parsedOffset,



          total,



          hasMore: parsedOffset + activities.length < total,



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



    return NextResponse.json(



      { error: "Unable to process the request." },



      {



        status: 500,



        headers: { "Cache-Control": "no-store" },



      },



    );



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



      return NextResponse.json(



        { error: "Request body must contain valid JSON." },



        { status: 400 },



      );



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



    // Match by the strongest available identifier first. Never link solely by

    // name when contact details were supplied and point to another customer.

    let customerId: string | null = null;

    let customerLookupError: string | null = null;

    let existingCustomer: { id: string; name: string; phone: string | null; email: string | null } | null = null;



    if (customerEmail) {

      const result = await access.supabase

        .from("customers")

        .select("id,name,phone,email")

        .ilike("email", customerEmail)

        .limit(1)

        .maybeSingle();

      existingCustomer = result.data;

      customerLookupError = result.error?.message ?? null;

    }



    if (!existingCustomer && !customerLookupError && customerPhone) {

      const result = await access.supabase

        .from("customers")

        .select("id,name,phone,email")

        .eq("phone", customerPhone)

        .limit(1)

        .maybeSingle();

      existingCustomer = result.data;

      customerLookupError = result.error?.message ?? null;

    }



    if (!existingCustomer && !customerLookupError && !customerEmail && !customerPhone) {

      const result = await access.supabase

        .from("customers")

        .select("id,name,phone,email")

        .ilike("name", customerName)

        .limit(1)

        .maybeSingle();

      existingCustomer = result.data;

      customerLookupError = result.error?.message ?? null;

    }



    if (customerLookupError) {

      console.error("Customer lookup failed:", customerLookupError);

      return NextResponse.json(

        { error: "Unable to verify customer details. Check customer table permissions." },

        { status: 500, headers: { "Cache-Control": "no-store" } },

      );

    }



    if (existingCustomer) {

      customerId = existingCustomer.id;

      const customerUpdates = {

        name: customerName,

        ...(customerPhone ? { phone: customerPhone } : {}),

        ...(customerEmail ? { email: customerEmail } : {}),

      };

      const { error: customerUpdateError } = await access.supabase

        .from("customers")

        .update(customerUpdates)

        .eq("id", existingCustomer.id);

      if (customerUpdateError) {

        console.error("Customer update failed:", customerUpdateError.message);

        return NextResponse.json(

          { error: "Unable to save customer contact details. Check customer table permissions." },

          { status: 500, headers: { "Cache-Control": "no-store" } },

        );

      }

    } else {

      const { data: createdCustomer, error: customerCreateError } = await access.supabase

        .from("customers")

        .insert({

          name: customerName,

          phone: customerPhone || null,

          email: customerEmail || null,

        })

        .select("id")

        .single();

      if (customerCreateError || !createdCustomer) {

        console.error("Customer creation failed:", customerCreateError?.message);

        return NextResponse.json(

          { error: "Unable to create customer. Check customer table permissions." },

          { status: 500, headers: { "Cache-Control": "no-store" } },

        );

      }

      customerId = createdCustomer.id;

    }



    const { data, error } = await access.supabase

      .from("activities")

      .insert({

        customer_id: customerId,

        customer_name: customerName,

        customer_phone: customerPhone || null,

        customer_email: customerEmail || null,

        activity_type: activity.activityType,

        status: activity.status,

        notes: activity.notes,

      })

      .select(activityColumns)

      .single();



    if (error) {



      console.error("Activity creation failed:", error.message);



      return NextResponse.json(



        { error: "Unable to save the activity." },



        { status: 500 },



      );



    }



    return NextResponse.json(



      {



        message: "Activity created successfully.",



        data,



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



    return NextResponse.json(



      { error: "Unable to process the request." },



      { status: 500 },



    );



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



      return NextResponse.json(



        { error: "Request body must contain valid JSON." },



        { status: 400 },



      );



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



      ...(activity.status !== undefined



        ? { status: activity.status }



        : {}),



      ...(activity.notes !== undefined



        ? { notes: activity.notes }



        : {}),



    };



    const { data, error } = await access.supabase



      .from("activities")



      .update(updates)



      .eq("id", activity.id)



      .select(activityColumns)



      .maybeSingle();



    if (error) {



      console.error("Activity update failed:", error.message);



      return NextResponse.json(



        { error: "Unable to update the activity." },



        {



          status: 500,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    if (!data) {



      return NextResponse.json(



        { error: "Activity not found or unavailable." },



        {



          status: 404,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    return NextResponse.json(



      {



        message: "Activity updated successfully.",



        data,



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



    return NextResponse.json(



      { error: "Unable to process the request." },



      {



        status: 500,



        headers: { "Cache-Control": "no-store" },



      },



    );



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



      return NextResponse.json(



        { error: "A valid activity ID is required." },



        { status: 400 },



      );



    }



    const { data, error } = await access.supabase



      .from("activities")



      .delete()



      .eq("id", idValidation.data)



      .select("id")



      .maybeSingle();



    if (error) {



      console.error("Activity deletion failed:", error.message);



      return NextResponse.json(



        { error: "Unable to delete the activity." },



        {



          status: 500,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    if (!data) {



      return NextResponse.json(



        { error: "Activity not found or unavailable." },



        {



          status: 404,



          headers: { "Cache-Control": "no-store" },



        },



      );



    }



    return NextResponse.json(



      {



        message: "Activity deleted successfully.",



        data: { id: data.id },



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



    return NextResponse.json(
      { error: "Unable to process the request." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
