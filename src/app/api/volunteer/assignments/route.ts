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

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = adminClient();
    const { data, error } = await admin
      .from("shift_assignments")
      .select(
        "id,status,sub_shift_id,sub_shifts(id,role_name,start_time,end_time,event_id,events!sub_shifts_event_id_fkey(id,title,start_time,end_time,location))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const result = (data ?? []).map((row: any) => {
      const sub = row.sub_shifts;
      const evt = sub?.events;
      return {
        id: row.id,
        status: row.status,
        sub_shift_id: row.sub_shift_id,
        role_name: sub?.role_name ?? "",
        start_time: sub?.start_time ?? evt?.start_time ?? null,
        end_time: sub?.end_time ?? evt?.end_time ?? null,
        event_id: sub?.event_id ?? evt?.id ?? null,
        event_title: evt?.title ?? "",
        event_location: evt?.location ?? null,
        event_start_time: evt?.start_time ?? null,
        event_end_time: evt?.end_time ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to load assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sub_shift_id } = await request.json();
    if (!sub_shift_id) {
      return NextResponse.json({ error: "Missing sub_shift_id" }, { status: 400 });
    }

    const admin = adminClient();

    const { data: subShift, error: ssErr } = await admin
      .from("sub_shifts")
      .select(
        "id,capacity,role_name,start_time,end_time,event_id,events!sub_shifts_event_id_fkey(id,title,start_time,end_time,location)"
      )
      .eq("id", sub_shift_id)
      .single();
    if (ssErr) throw ssErr;
    if (!subShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const { count } = await admin
      .from("shift_assignments")
      .select("id", { count: "exact", head: true })
      .eq("sub_shift_id", sub_shift_id);

    const capacity = subShift.capacity ?? 0;
    const filled = count ?? 0;
    if (capacity > 0 && filled >= capacity) {
      return NextResponse.json({ error: "Shift is full" }, { status: 409 });
    }

    // Prevent signing up for overlapping shifts
    const effectiveStart = subShift.start_time ?? (Array.isArray(subShift.events) ? subShift.events[0]?.start_time : (subShift.events as any)?.start_time);
    const effectiveEnd = subShift.end_time ?? (Array.isArray(subShift.events) ? subShift.events[0]?.end_time : (subShift.events as any)?.end_time);

    if (effectiveStart && effectiveEnd) {
      const { data: existingAssignments, error: existingErr } = await admin
        .from("shift_assignments")
        .select(
          "id,status,sub_shifts!inner(start_time,end_time,event_id,events!sub_shifts_event_id_fkey(id,start_time,end_time))"
        )
        .eq("user_id", user.id)
        .in("status", ["confirmed", "pending_swap"]);

      if (existingErr) throw existingErr;

      const aStart = new Date(effectiveStart).getTime();
      const aEnd = new Date(effectiveEnd).getTime();

      const hasOverlap = (existingAssignments ?? []).some((row: any) => {
        const sub = row.sub_shifts;
        const evt = sub?.events;
        const bStartISO = sub?.start_time ?? evt?.start_time;
        const bEndISO = sub?.end_time ?? evt?.end_time;
        if (!bStartISO || !bEndISO) return false;
        const bStart = new Date(bStartISO).getTime();
        const bEnd = new Date(bEndISO).getTime();
        return aStart < bEnd && bStart < aEnd;
      });

      if (hasOverlap) {
        return NextResponse.json({ error: "Shift overlaps with your existing schedule" }, { status: 409 });
      }
    }

    const { data: inserted, error: insertErr } = await admin
      .from("shift_assignments")
      .insert({ sub_shift_id, user_id: user.id, status: "confirmed" })
      .select("id,status")
      .single();
    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "You are already signed up for this shift" }, { status: 409 });
      }
      throw insertErr;
    }

    const evt = Array.isArray(subShift.events) ? subShift.events[0] : subShift.events;
    const responsePayload = {
      id: inserted?.id,
      status: inserted?.status ?? "confirmed",
      sub_shift_id,
      role_name: subShift.role_name,
      start_time: subShift.start_time,
      end_time: subShift.end_time,
      event_title: evt?.title ?? "",
      event_location: evt?.location ?? null,
      event_start_time: evt?.start_time ?? null,
      event_end_time: evt?.end_time ?? null,
    };

    return NextResponse.json(responsePayload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to sign up" }, { status: 500 });
  }
}
