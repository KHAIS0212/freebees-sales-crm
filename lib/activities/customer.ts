
import type { SupabaseClient } from "@supabase/supabase-js";

export type BranchAction = "use_existing" | "create_branch";

type CustomerResult =
  | {
      ok: true;
      customerId: string;
    }
  | {
      ok: false;
      reason: "lookup" | "update" | "create" | "branch_choice_required";
      message: string;
    };

type FindOrCreateCustomerOptions = {
  customerId?: string | null;
  brandId?: string | null;
  customerLocation?: string;
  branchAction?: BranchAction;
};

type CustomerDetails = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  brand_id: string | null;
};

type BranchInsertDetails = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerLocation: string;
  brandId: string;
};

type BranchComparisonDetails = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerLocation: string;
  brandId: string | null;
};

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sameDetails(
  branch: CustomerDetails,
  details: BranchComparisonDetails,
): boolean {
  return (
    normalized(branch.name) === details.customerName &&
    normalized(branch.phone) === details.customerPhone &&
    normalized(branch.email).toLowerCase() === details.customerEmail &&
    normalized(branch.location) === details.customerLocation &&
    (branch.brand_id ?? null) === details.brandId
  );
}

async function insertBranch(
  supabase: SupabaseClient,
  details: BranchInsertDetails,
): Promise<CustomerResult> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: details.customerName,
      phone: details.customerPhone || null,
      email: details.customerEmail || null,
      location: details.customerLocation || null,
      brand_id: details.brandId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "Customer branch creation failed:",
      error?.message,
    );

    return {
      ok: false,
      reason: "create",
      message: "Unable to create the restaurant branch.",
    };
  }

  return {
    ok: true,
    customerId: data.id as string,
  };
}

export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  options: FindOrCreateCustomerOptions = {},
): Promise<CustomerResult> {
  const details = {
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerLocation: options.customerLocation?.trim() ?? "",
  };

  const customerId = options.customerId ?? null;
  const requestedBrandId = options.brandId ?? null;
  const branchAction = options.branchAction;

  // Existing branch selected by the user.
  if (customerId) {
    const { data: branch, error } = await supabase
      .from("customers")
      .select("id,name,phone,email,location,brand_id")
      .eq("id", customerId)
      .maybeSingle();

    if (error || !branch) {
      console.error(
        "Customer branch lookup failed:",
        error?.message,
      );

      return {
        ok: false,
        reason: "lookup",
        message: "The selected restaurant branch could not be found.",
      };
    }

    const selectedBranch = branch as CustomerDetails;

    // Reject a branch that conflicts with the requested brand.
    if (
      requestedBrandId &&
      selectedBranch.brand_id &&
      requestedBrandId !== selectedBranch.brand_id
    ) {
      return {
        ok: false,
        reason: "lookup",
        message:
          "The selected branch does not belong to the selected brand.",
      };
    }

    // Keep the existing branch unchanged. Activity contact details are stored
    // separately on the activity.
    if (branchAction === "use_existing") {
      return {
        ok: true,
        customerId: selectedBranch.id,
      };
    }

    // Create a separate branch under the selected branch's brand.
    if (branchAction === "create_branch") {
      if (!selectedBranch.brand_id) {
        return {
          ok: false,
          reason: "lookup",
          message:
            "The selected branch has no restaurant brand to link to.",
        };
      }

      return insertBranch(supabase, {
        ...details,
        brandId: selectedBranch.brand_id,
      });
    }

    // No new branch is needed if the selected details are unchanged.
    if (
      sameDetails(selectedBranch, {
        ...details,
        brandId: selectedBranch.brand_id,
      })
    ) {
      return {
        ok: true,
        customerId: selectedBranch.id,
      };
    }

    // Require an explicit choice if the user edited an existing branch.
    return {
      ok: false,
      reason: "branch_choice_required",
      message:
        "The selected branch details were changed. Choose whether to use the edited details for this activity or create a new branch.",
    };
  }

  // Branch actions are only valid when an existing branch was selected.
  if (branchAction) {
    return {
      ok: false,
      reason: "lookup",
      message:
        "Select an existing branch before choosing a branch action.",
    };
  }

  let brandId = requestedBrandId;

  // Validate a brand explicitly selected by the user.
  if (brandId) {
    const { data: brand, error } = await supabase
      .from("customer_brands")
      .select("id")
      .eq("id", brandId)
      .maybeSingle();

    if (error || !brand) {
      console.error(
        "Customer brand lookup failed:",
        error?.message,
      );

      return {
        ok: false,
        reason: "lookup",
        message: "The selected restaurant brand could not be found.",
      };
    }
  } else {
    // Reuse a matching brand when one already exists.
    const { data: existingBrand, error: brandLookupError } =
      await supabase
        .from("customer_brands")
        .select("id")
        .ilike("name", details.customerName)
        .limit(1)
        .maybeSingle();

    if (brandLookupError) {
      console.error(
        "Customer brand lookup failed:",
        brandLookupError.message,
      );

      return {
        ok: false,
        reason: "lookup",
        message: "Unable to find the restaurant brand.",
      };
    }

    if (existingBrand) {
      brandId = existingBrand.id as string;
    } else {
      // A concurrent request can still create the same brand here.
      // Enforce uniqueness or use an atomic upsert in a future migration.
      const { data: createdBrand, error: brandCreateError } =
        await supabase
          .from("customer_brands")
          .insert({
            name: details.customerName,
          })
          .select("id")
          .single();

      if (brandCreateError || !createdBrand) {
        console.error(
          "Customer brand creation failed:",
          brandCreateError?.message,
        );

        return {
          ok: false,
          reason: "create",
          message: "Unable to create the restaurant brand.",
        };
      }

      brandId = createdBrand.id as string;
    }
  }

  return insertBranch(supabase, {
    ...details,
    brandId,
  });
}
