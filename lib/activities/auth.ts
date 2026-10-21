import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";

export async function getActiveTeamClient(){
    const supabase = await createClient();
    const{data:claimsData, error:claimsError}= await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if(
        claimsError ||
        typeof userId !== "string" ||
        userId.length === 0
    ){
        return {
            ok: false as const,
            response: NextResponse.json(
                {error:"Authentication required."},
                {
                    status:401,
                    headers:{"Cache-Control":"no-store"},
                },
            ),
        };
    }

    const{data:member, error:memberError}=await supabase
        .from("team_members")
        .select("user_id,role,is_active")
        .eq("user_id",userId)
        .maybeSingle();
    if(memberError){
        console.error(
            "Team membership verification failed:",
            memberError.message,
        );
        return{
            ok:false as const,
            response:NextResponse.json(
                {error:"Unable to verify team membership."},
                {
                    status:500,
                    headers:{"Cache-Control":"no-store"},
                },
            ),
        };
    }

    if(!member || !member.is_active){
        return{
            ok:false as const,
            response:NextResponse.json(
                {error:"Active team membership required."},
                {
                    status:403,
                    headers:{"Cache-Control":"no-store"},
                },
            ),
        };
    }

    return{ok:true as const, supabase, member};
}

export async function getActiveAdminClient(){
    const access =  await getActiveTeamClient();

    if(!access.ok){
        return access;
    }
    if(access.member.role !== "admin"){
        return{
            ok:false as const,
            response:NextResponse.json(
                {error:"Administrator access required."},
                {
                    status:403,
                    headers:{"Cache-Control":"no-store"},
                },
            ),
        };
    }
    return access;
}