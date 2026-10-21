
import type { SupabaseClient } from "@supabase/supabase-js";
import { activityColumns } from "./validations";
import type { ActivityFilters } from "./filters";

export type ActivityQueryResult =
  | {
      ok: true;
      data: Record<string, unknown>[];
      total: number;
      limit: number;
      offset: number;
    }
  | {
      ok: false;
      stage: "activities" | "customers";
      message: string;
    };

type CustomerContact = {
  phone: string | null;
  email: string | null;
};

type RelatedCustomer = CustomerContact | CustomerContact[] | null;

function resolveCustomerContact(
  customer: CustomerContact | undefined,
  activityPhone: string | null,
  activityEmail: string | null,
): Pick<CustomerContact, "phone" | "email"> {
  return {
    phone: activityPhone || customer?.phone || null,
    email: activityEmail || customer?.email || null,
  };
}

function resolveRelatedCustomer(
  customer: RelatedCustomer,
): CustomerContact | undefined {
  if (Array.isArray(customer)) {
    return customer[0] ?? undefined;
  }

  return customer ?? undefined;
}

export async function queryActivities(
  supabase: SupabaseClient,
  filters: ActivityFilters,
  requestId?: string,
): Promise<ActivityQueryResult> {
  const {
    limit,
    offset,
    search,
    status,
    activityType,
    from,
    to,
  } = filters;

  const logPrefix = requestId
    ? `[Dashboard ${requestId}]`
    : "[Activity Query]";

  const searchTerm = search
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  let query = supabase
    .from("activities")
    .select(`${activityColumns}, customers(phone,email)`, {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (searchTerm) {
    query = query.or(
      `customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`,
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (activityType) {
    query = query.eq("activity_type", activityType);
  }

  if (from) {
    query = query.gte(
      "created_at",
      `${from}T00:00:00.000Z`,
    );
  }

  if (to) {
    const dayAfterTo = new Date(`${to}T00:00:00.000Z`);
    dayAfterTo.setUTCDate(dayAfterTo.getUTCDate() + 1);

    query = query.lt(
      "created_at",
      dayAfterTo.toISOString(),
    );
  }

  const activitiesQueryStart = performance.now();

  const { data, error, count } = await query.range(
    offset,
    offset + limit - 1,
  );

  console.log(
    `${logPrefix} Activities query: ${
      (performance.now() - activitiesQueryStart).toFixed(2)
    } ms`,
  );

  if (error) {
    console.error(
      `${logPrefix} Activity retrieval failed:`,
      error.message,
    );

    return {
      ok: false,
      stage: "activities",
      message: "Unable to retrieve activities.",
    };
  }

  const activities = (data ?? []).map((activity) => {
    const customer = resolveRelatedCustomer(
      activity.customers as RelatedCustomer,
    );

    return {
      ...activity,
      ...resolveCustomerContact(
        customer,
        activity.customer_phone,
        activity.customer_email,
      ),
    };
  });

  return {
    ok: true,
    data: activities as Record<string, unknown>[],
    total: count ?? 0,
    limit,
    offset,
  };
}

export async function queryLatestDashboardActivities(
  supabase: SupabaseClient,
): Promise<ActivityQueryResult> {
  const { data, error } = await supabase
    .from("activities")
    .select(`${activityColumns}, customers(phone,email)`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(
      "Latest dashboard activities query failed:",
      error.message,
    );

    return {
      ok: false,
      stage: "activities",
      message: "Unable to retrieve activities.",
    };
  }

  const activities = (data ?? []).map((activity) => {
    const customer = resolveRelatedCustomer(
      activity.customers as RelatedCustomer,
    );

    return {
      ...activity,
      ...resolveCustomerContact(
        customer,
        activity.customer_phone,
        activity.customer_email,
      ),
    };
  });

  return {
    ok: true,
    data: activities as Record<string, unknown>[],
    total: activities.length,
    limit: 10,
    offset: 0,
  };
}
