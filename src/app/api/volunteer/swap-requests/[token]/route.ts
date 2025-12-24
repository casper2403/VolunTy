import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const admin = adminClient();

    // Fetch swap request by token
    const { data: swapRequest, error: swapErr } = await admin
      .from("swap_requests")
      .select(
        "id, status, created_at, requester_id, assignment_id, shift_assignments!inner(sub_shift_id, sub_shifts!inner(id, role_name, start_time, end_time, event_id, events!inner(id, title, start_time, end_time, location))), profiles!requester_id(full_name)"
      )
      .eq("share_token", params.token)
      .eq("status", "open")
      .single();

    if (swapErr || !swapRequest) {
      return NextResponse.json(
        { error: "Swap request not found or expired" },
        { status: 404 }
      );
    }

    const assignment = Array.isArray(swapRequest.shift_assignments) 
      ? swapRequest.shift_assignments[0] 
      : swapRequest.shift_assignments;
    const subShift = Array.isArray(assignment?.sub_shifts)
      ? assignment?.sub_shifts[0]
      : assignment?.sub_shifts;
    const event = Array.isArray(subShift?.events)
      ? subShift?.events[0]
      : subShift?.events;
    const requester = Array.isArray(swapRequest.profiles)
      ? swapRequest.profiles[0]
      : swapRequest.profiles;

    return NextResponse.json({
      id: swapRequest.id,
      status: swapRequest.status,
      created_at: swapRequest.created_at,
      requester_name: requester?.full_name ?? "Unknown",
      role_name: subShift?.role_name ?? "",
      start_time: subShift?.start_time ?? event?.start_time,
      end_time: subShift?.end_time ?? event?.end_time,
      event_title: event?.title ?? "",
      event_location: event?.location ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to load swap request" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();
    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const admin = adminClient();

    // Fetch swap request
    const { data: swapRequest, error: swapErr } = await admin
      .from("swap_requests")
      .select("id, requester_id, assignment_id, status")
      .eq("share_token", params.token)
      .single();

    if (swapErr || !swapRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    if (swapRequest.status !== "open") {
      return NextResponse.json(
        { error: "Swap request is no longer available" },
        { status: 409 }
      );
    }

    // Can't accept your own swap request
    if (swapRequest.requester_id === user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own swap request" },
        { status: 403 }
      );
    }

    if (action === "decline") {
      // Just mark it as cancelled
      const { error: updateErr } = await admin
        .from("swap_requests")
        .update({ status: "cancelled" })
        .eq("id", swapRequest.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, status: "cancelled" });
    }

    // Handle accept: swap the assignments
    // 1. Get both assignments
    const { data: assignment1, error: err1 } = await admin
      .from("shift_assignments")
      .select("id, user_id, sub_shift_id")
      .eq("id", swapRequest.assignment_id)
      .single();

    if (err1 || !assignment1) {
      return NextResponse.json(
        { error: "Original assignment not found" },
        { status: 404 }
      );
    }

    // Find this user's assignment for the same sub_shift (if exists)
    const { data: userAssignments } = await admin
      .from("shift_assignments")
      .select("id, user_id, sub_shift_id")
      .eq("user_id", user.id)
      .eq("sub_shift_id", assignment1.sub_shift_id);

    if (userAssignments && userAssignments.length > 0) {
      return NextResponse.json(
        { error: "You are already assigned to this shift" },
        { status: 409 }
      );
    }

    // 2. Swap users: update both assignments to swap user_id
    const { error: swapErr1 } = await admin
      .from("shift_assignments")
      .update({ user_id: user.id })
      .eq("id", assignment1.id);

    if (swapErr1) throw swapErr1;

    // 3. Mark swap request as accepted
    const { error: acceptErr } = await admin
      .from("swap_requests")
      .update({ status: "accepted", accepted_by_id: user.id })
      .eq("id", swapRequest.id);

    if (acceptErr) throw acceptErr;

    return NextResponse.json({ success: true, status: "accepted" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to process swap request" },
      { status: 500 }
    );
  }
}
