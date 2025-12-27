import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    
    // Try to get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Get all users (admin only - for debugging)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role, calendar_token")
      .limit(10);

    return NextResponse.json({
      status: "ok",
      currentUser: { user, error: userError?.message },
      profiles: { count: profiles?.length || 0, error: profilesError?.message },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
