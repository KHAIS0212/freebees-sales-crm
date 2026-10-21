import { z } from "zod";

const activityFields = {
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(30).default(""),
  customerEmail: z
    .string()
    .trim()
    .max(254)
    .default("")
    .refine(
      (value) =>
        !value || z.string().email().safeParse(value).success,
      "Enter a valid email address.",
    ),
  activityType: z.enum(["CALL", "RESTAURANT_VISIT", "MEETING", "EMAIL"]),
  status: z.enum(["PENDING", "COMPLETED", "FOLLOW_UP_REQUIRED"]),
  notes: z.string().max(2000),
};

export const activitySchema = z.object({
  ...activityFields,
  customerId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  customerLocation: z.string().trim().max(200).default(""),
  branchAction: z.enum(["use_existing", "create_branch"]).optional(),
  notes: activityFields.notes.default(""),
});

export const updateActivitySchema = z
  .object({
    id: z.string().uuid(),
    customerName: activityFields.customerName.optional(),
    customerPhone: activityFields.customerPhone.optional(),
    customerEmail: activityFields.customerEmail.optional(),
    activityType: activityFields.activityType.optional(),
    status: activityFields.status.optional(),
    notes: activityFields.notes.optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) => key !== "id"),
    "At least one field must be provided for update.",
  );

export const activityIdSchema = z.string().uuid();

export const activityColumns =
  "id,customer_id,customer_name,customer_phone,customer_email,activity_type,status,notes,created_at";
