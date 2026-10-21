export type ActivityType =
    | "CALL"
    | "RESTAURANT_VISIT"
    | "MEETING"
    | "EMAIL";

export type ActivityStatus =
    | "PENDING"
    | "COMPLETED"
    | "FOLLOW_UP_REQUIRED";

export type SalesActivity = {
    id: string;
    customer_name: string;
    customer_phone?: string | null;
    customer_email?: string | null;
    activity_type:ActivityType;
    status:ActivityStatus;
    notes:string;
    created_at:string;
};