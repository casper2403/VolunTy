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
    const { data: requests, error } = await admin
      .from("swap_requests")
      .select("id, assignment_id, requester_id, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (!requests || requests.length === 0) {
      return NextResponse.json([]);
    }

    const assignmentIds = requests.map((r) => r.assignment_id);
    const { data: assignments, error: assignErr } = await admin
      .from("shift_assignments")
      .select("id, sub_shift_id, user_id")
      .in("id", assignmentIds);
    if (assignErr) throw assignErr;

    const subShiftIds = assignments?.map((a) => a.sub_shift_id) ?? [];
    const { data: subShifts, error: ssErr } = await admin
      .from("sub_shifts")
      .select("id, event_id, role_name, start_time, end_time")
      .in("id", subShiftIds);
    if (ssErr) throw ssErr;

    const eventIds = subShifts?.map((s) => s.event_id) ?? [];
    const { data: events, error: evErr } = await admin
      .from("events")
      .select("id, title, start_time, end_time")
      .in("id", eventIds);
    if (evErr) throw evErr;

    const profilesMap: Record<string, { email?: string; full_name?: string }> = {};
    const requesterIds = Array.from(new Set(requests.map((r) => r.requester_id)));
    if (requesterIds.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, full_name, auth:auth.users(email)")
        .in("id", requesterIds);
      (profs ?? []).forEach((p: any) => {
        profilesMap[p.id] = {
          email: p.auth?.[0]?.email,
          full_name: p.full_name,
        };
      });
    }

    const subShiftMap = Object.fromEntries((subShifts ?? []).map((s) => [s.id, s]));
    const eventMap = Object.fromEntries((events ?? []).map((e) => [e.id, e]));

    const result = requests.map((r) => {
      const assignment = assignments?.find((a) => a.id === r.assignment_id);
      const sub = assignment ? subShiftMap[assignment.sub_shift_id] : undefined;
      const evt = sub ? eventMap[sub.event_id] : undefined;
      const requester = profilesMap[r.requester_id] ?? {};
      return {
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        requester_name: requester.full_name ?? "Unknown",
        requester_email: requester.email ?? "",
        role_name: sub?.role_name ?? "",
        start_time: sub?.start_time ?? evt?.start_time,
        end_time: sub?.end_time ?? evt?.end_time,
        event_title: evt?.title ?? "",
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to fetch swap requests" }, { status: 500 });
  }
}
