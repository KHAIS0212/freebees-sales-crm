import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function POST(request:NextRequest){
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if(!url || !key){
        return NextResponse.json(
            {error:"Server configuration error."},
            {status:500},
        );
    }

    const response = NextResponse.json(
        {message:"Signed out successfully"},
        {
            status:200,
            headers:{"Cache-Control":"no-store"},
        },
    );
    const supabase = createServerClient(url,key,{
        cookies:{
            getAll(){
                return request.cookies.getAll();
            },
            setAll(cookiesToSet){
                cookiesToSet.forEach(({name,value,options})=>{
                    response.cookies.set(name,value,options);
                });
            },
        },
    });

    const {error}=await supabase.auth.signOut();

    if(error){
        return NextResponse.json(
            {error:"Unable to sign out.Please try again."},
            {status:500, headers:{"Cache-Control":"no-store"}},
        );
    }

    return response;
}