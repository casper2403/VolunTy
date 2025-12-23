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
    const { data: events, error: evErr } = await admin
      .from("events")
      .select("id,title,start_time,end_time,sub_shifts(id,role_name,start_time,end_time,capacity)")
      .order("start_time", { ascending: true });
    if (evErr) throw evErr;

    const eventIds = (events ?? []).map((e: any) => e.id);
    let capacities: Record<string, number> = {};
    let filled: Record<string, number> = {};

    if (eventIds.length) {
      const { data: subShifts } = await admin
        .from("sub_shifts")
        .select("id,event_id,capacity").in("event_id", eventIds);
      const byEvent: Record<string, { subShiftIds: string[]; capacity: number }> = {};
      (subShifts ?? []).forEach((s: any) => {
        const ev = s.event_id;
        byEvent[ev] ??= { subShiftIds: [], capacity: 0 };
        byEvent[ev].capacity += s.capacity ?? 0;
        byEvent[ev].subShiftIds.push(s.id);
      });
      capacities = Object.fromEntries(Object.entries(byEvent).map(([k, v]) => [k, v.capacity]));

      const allSubShiftIds = (subShifts ?? []).map((s: any) => s.id);
      if (allSubShiftIds.length) {
        const { data: assignments } = await admin
          .from("shift_assignments")
          .select("id,sub_shift_id").in("sub_shift_id", allSubShiftIds);
        const countBySub: Record<string, number> = {};
        (assignments ?? []).forEach((a: any) => {
          countBySub[a.sub_shift_id] = (countBySub[a.sub_shift_id] ?? 0) + 1;
        });
        filled = Object.fromEntries(
          Object.entries(byEvent).map(([eventId, v]) => {
            const total = v.subShiftIds.reduce((acc, id) => acc + (countBySub[id] ?? 0), 0);
            return [eventId, total];
          })
        );
      }
    }

    const payload = (events ?? []).map((e: any) => ({
      ...e,
      capacity: capacities[e.id] ?? 0,
      filled: filled[e.id] ?? 0,
    }));
    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, start_time, end_time, sub_shifts } = body;
    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = getAdmin();
    const { data: ev, error: evErr } = await admin
      .from("events")
      .insert({ title, start_time, end_time })
      .select("id,title,start_time,end_time")
      .single();
    if (evErr) throw evErr;

    let capacityTotal = 0;
    if (Array.isArray(sub_shifts) && sub_shifts.length) {
      const rows = sub_shifts.map((s: any) => ({
        event_id: ev.id,
        role_name: s.role_name,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity ?? 1,
      }));
      const { error: ssErr } = await admin.from("sub_shifts").insert(rows);
      if (ssErr) throw ssErr;
      capacityTotal = rows.reduce((acc, r) => acc + (r.capacity ?? 0), 0);
    }

    return NextResponse.json({ ...ev, capacity: capacityTotal });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to create" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, start_time, end_time, sub_shifts } = body;
    if (!id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = getAdmin();
    const { error: evErr } = await admin
      .from("events")
      .update({ title, start_time, end_time })
      .eq("id", id);
    if (evErr) throw evErr;

    // replace sub_shifts
    await admin.from("sub_shifts").delete().eq("event_id", id);
    let capacityTotal = 0;
    if (Array.isArray(sub_shifts) && sub_shifts.length) {
      const rows = sub_shifts.map((s: any) => ({
        event_id: id,
        role_name: s.role_name,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity ?? 1,
      }));
      const { error: ssErr } = await admin.from("sub_shifts").insert(rows);
      if (ssErr) throw ssErr;
      capacityTotal = rows.reduce((acc, r) => acc + (r.capacity ?? 0), 0);
    }

    return NextResponse.json({ id, title, start_time, end_time, capacity: capacityTotal });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const admin = getAdmin();
    const { error } = await admin.from("events").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to delete" }, { status: 500 });
  }
}
