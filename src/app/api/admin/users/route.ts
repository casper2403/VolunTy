import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const admin = adminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, role, auth:auth.users(email)");
    if (error) throw error;
    const mapped = (data ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      email: p.auth?.[0]?.email ?? null,
    }));
    return NextResponse.json(mapped);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, role } = await request.json();
    if (!id || !role) {
      return NextResponse.json({ error: "Missing id or role" }, { status: 400 });
    }
    const admin = adminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to update role" }, { status: 500 });
  }
}
