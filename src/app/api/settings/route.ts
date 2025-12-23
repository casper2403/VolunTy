import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key);
}

export async function GET() {
  try {
    const admin = getAdmin();
    const { data, error } = await admin
      .from("organization_settings")
      .select("key, value");
    
    if (error) throw error;
    
    const settings = Object.fromEntries(
      (data || []).map((s: any) => [s.key, s.value])
    );
    
    return NextResponse.json(settings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }
    
    const admin = getAdmin();
    const { error } = await admin
      .from("organization_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to update setting" }, { status: 500 });
  }
}
