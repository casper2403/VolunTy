import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

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

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = adminClient();

    // Get all open/accepted swap requests (including other users) for timeline context
    const { data: requests, error: reqErr } = await admin
      .from("swap_requests")
      .select(
        "id,status,created_at,share_token,assignment_id,requester_id,shift_assignments!inner(sub_shift_id,sub_shifts!inner(id,role_name,start_time,end_time,event_id,events!inner(id,title,start_time,end_time,location)))"
      )
      .in("status", ["open", "accepted"]);

    if (reqErr) throw reqErr;

    const result = (requests ?? []).map((r: any) => {
      const assignment = r.shift_assignments;
      const subShift = assignment?.sub_shifts;
      const event = subShift?.events;

      return {
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        share_token: r.share_token,
        is_mine: r.requester_id === user.id,
        requester_id: r.requester_id,
        event_id: event?.id ?? null,
        role_name: subShift?.role_name ?? "",
        start_time: subShift?.start_time ?? event?.start_time,
        end_time: subShift?.end_time ?? event?.end_time,
        event_title: event?.title ?? "",
        event_location: event?.location ?? null,
        share_link: `/swap-requests/${r.share_token}`,
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to load swap requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignment_id } = await request.json();
    if (!assignment_id) {
      return NextResponse.json(
        { error: "Missing assignment_id" },
        { status: 400 }
      );
    }

    const admin = adminClient();

    // Verify this assignment belongs to the user
    const { data: assignment, error: assignErr } = await admin
      .from("shift_assignments")
      .select("id, user_id")
      .eq("id", assignment_id)
      .single();

    if (assignErr || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only swap your own assignments" },
        { status: 403 }
      );
    }

    // Check if there's already an open swap request for this assignment
    const { data: existingSwap } = await admin
      .from("swap_requests")
      .select("id")
      .eq("assignment_id", assignment_id)
      .eq("status", "open")
      .single();

    if (existingSwap) {
      return NextResponse.json(
        { error: "You already have an open swap request for this shift" },
        { status: 409 }
      );
    }

    // Generate unique share token
    const share_token = crypto.randomBytes(16).toString("hex");

    // Create swap request
    const { data: inserted, error: insertErr } = await admin
      .from("swap_requests")
      .insert({
        assignment_id,
        requester_id: user.id,
        status: "open",
        share_token,
      })
      .select("id, share_token, created_at")
      .single();

    if (insertErr) throw insertErr;

    // Update assignment status to pending_swap
    const { error: updateErr } = await admin
      .from("shift_assignments")
      .update({ status: "pending_swap" })
      .eq("id", assignment_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      id: inserted.id,
      share_token: inserted.share_token,
      share_link: `/swap-requests/${inserted.share_token}`,
      created_at: inserted.created_at,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to create swap request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Missing swap request id" },
        { status: 400 }
      );
    }

    const admin = adminClient();

    // Verify this swap request belongs to the user
    const { data: swapRequest, error: fetchErr } = await admin
      .from("swap_requests")
      .select("id, requester_id, assignment_id")
      .eq("id", id)
      .single();

    if (fetchErr || !swapRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    if (swapRequest.requester_id !== user.id) {
      return NextResponse.json(
        { error: "You can only cancel your own swap requests" },
        { status: 403 }
      );
    }

    // Cancel the request
    const { error: cancelErr } = await admin
      .from("swap_requests")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (cancelErr) throw cancelErr;

    // Update assignment status back to confirmed
    const { error: updateErr } = await admin
      .from("shift_assignments")
      .update({ status: "confirmed" })
      .eq("id", swapRequest.assignment_id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to cancel swap request" },
      { status: 500 }
    );
  }
}
