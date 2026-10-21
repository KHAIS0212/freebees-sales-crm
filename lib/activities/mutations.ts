import type { SupabaseClient } from "@supabase/supabase-js";
import { activityColumns } from "./validations";



type UpdateActivityResult = 
    | {
        ok:true;
        data:Record<string,unknown>;
    }
    | {
        ok:false;
        reason:"database"|"not_found";
    };
export async function updateActivity(
    supabase:SupabaseClient,
    id:string,
    updates:Record<string,unknown>,
): Promise<UpdateActivityResult>{
    const{data,error}=await supabase
        .from("activities")
        .update(updates)
        .eq("id",id)
        .select(activityColumns)
        .maybeSingle()
    if(error){
        console.error("Activity update failed:",error.message);

        return{
            ok:false,
            reason:"database",
        };
    }

    if(!data){
        return{
            ok:false,
            reason:"not_found",
        };
    }

    return{
        ok:true,
        data:data as Record<string,unknown>,
    };
}

type DeleteActivityResult = 
    | {
        ok:true;
        id:string;
    }
    | {
        ok:false;
        reason:"database"|"not_found";
    };

export async function deleteActivity(
    supabase:SupabaseClient,
    id: string,
): Promise<DeleteActivityResult>{
    const {data,error}=await supabase
        .from("activities")
        .delete()
        .eq("id",id)
        .select("id")
        .maybeSingle();
    if(error){
        console.error("Activity deletion failed:",error.message);
        return{
            ok:false,
            reason:"database",
        };
    }

    if(!data){
        return{
            ok:false,
            reason:"not_found",
        };
    }
    return{
        ok:true,
        id:data.id,
    };
}

type CreateActivityResult=
    | {
        ok:true;
        data:Record<string, unknown>;
    }
    | {
        ok:false;
        reason:"database";
    };
type CreateActivityInput={
    customerId: string;
    customerName:string;
    customerPhone:string;
    customerEmail:string;
    activityType:"CALL"|"RESTAURANT_VISIT"|"MEETING"|"EMAIL";
    status:"PENDING"|"COMPLETED"|"FOLLOW_UP_REQUIRED";
    notes:string;
};

export async function createActivity(
    supabase:SupabaseClient,
    activity:CreateActivityInput,
): Promise<CreateActivityResult>{
    const {data,error} = await supabase
        .from("activities")
        .insert({
            customer_id:activity.customerId,
            customer_name:activity.customerName,
            customer_phone:activity.customerPhone || null,
            customer_email:activity.customerEmail || null,
            activity_type:activity.activityType,
            status:activity.status,
            notes:activity.notes,
        })
        .select(activityColumns)
        .single();
    if(error){
        console.error("Activity creation failed:",error.message);
        return{
            ok:false,
            reason:"database",
        };
    }
    return{
        ok:true,
        data:data as Record<string, unknown>,
    };
}
