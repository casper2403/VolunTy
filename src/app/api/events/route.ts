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
      .select("id,title,start_time,end_time,location,sub_shifts(id,role_name,start_time,end_time,capacity)")
      .order("start_time", { ascending: true });
    if (evErr) throw evErr;

    const eventIds = (events ?? []).map((e: any) => e.id);
    let capacities: Record<string, number> = {};
    let filledByEvent: Record<string, number> = {};
    let filledBySubShift: Record<string, number> = {};

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
        (assignments ?? []).forEach((a: any) => {
          filledBySubShift[a.sub_shift_id] = (filledBySubShift[a.sub_shift_id] ?? 0) + 1;
        });
        filledByEvent = Object.fromEntries(
          Object.entries(byEvent).map(([eventId, v]) => {
            const total = v.subShiftIds.reduce((acc, id) => acc + (filledBySubShift[id] ?? 0), 0);
            return [eventId, total];
          })
        );
      }
    }

    const payload = (events ?? []).map((e: any) => {
      const subShifts = (e.sub_shifts ?? [])
        .sort((a: any, b: any) => {
          // Sort by start_time, then by end_time (for consistent ordering of overlapping shifts)
          const aStart = a.start_time || "";
          const bStart = b.start_time || "";
          const startCompare = aStart.localeCompare(bStart);
          if (startCompare !== 0) return startCompare;
          const aEnd = a.end_time || "";
          const bEnd = b.end_time || "";
          return aEnd.localeCompare(bEnd);
        })
        .map((s: any) => ({
        ...s,
        filled: filledBySubShift[s.id] ?? 0,
        available: Math.max((s.capacity ?? 0) - (filledBySubShift[s.id] ?? 0), 0),
      }));
      const capacity = subShifts.reduce((acc: number, s: any) => acc + (s.capacity ?? 0), 0);
      const filled = subShifts.reduce((acc: number, s: any) => acc + (filledBySubShift[s.id] ?? 0), 0);
      return {
        ...e,
        sub_shifts: subShifts,
        capacity: capacity || capacities[e.id] || 0,
        filled: filled || filledByEvent[e.id] || 0,
      };
    });
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

    // Only re-process sub_shifts if they were explicitly provided in the request
    if (Array.isArray(sub_shifts) && sub_shifts.length > 0) {
      // Fetch existing sub_shifts to intelligently merge
      const { data: existingSubShifts, error: fetchErr } = await admin
        .from("sub_shifts")
        .select("id,role_name,start_time,end_time,capacity")
        .eq("event_id", id);
      if (fetchErr) throw fetchErr;

      const newSubShiftSpecs = sub_shifts.map((s: any) => ({
        role_name: s.role_name,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity ?? 1,
      }));

      const existingMap = new Map<string, any>(
        (existingSubShifts ?? []).map((s) => {
          const key = `${s.role_name}|${s.start_time}|${s.end_time}`;
          return [key, s];
        })
      );

      const newSpecs = new Set<string>(
        newSubShiftSpecs.map((s) => `${s.role_name}|${s.start_time}|${s.end_time}`)
      );

      // Delete sub_shifts that no longer exist (this cascades to delete assignments)
      // Only delete if the role_name|start_time|end_time combination is completely gone
      const idsToDelete = (existingSubShifts ?? [])
        .filter((s) => !newSpecs.has(`${s.role_name}|${s.start_time}|${s.end_time}`))
        .map((s) => s.id);

      if (idsToDelete.length > 0) {
        const { error: delErr } = await admin
          .from("sub_shifts")
          .delete()
          .in("id", idsToDelete);
        if (delErr) throw delErr;
      }

      // Insert or update remaining sub_shifts
      // IMPORTANT: Only update capacity, never recreate to preserve shift assignments
      for (const newSpec of newSubShiftSpecs) {
        const key = `${newSpec.role_name}|${newSpec.start_time}|${newSpec.end_time}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Update capacity if needed - preserves all shift assignments
          if (existing.capacity !== newSpec.capacity) {
            const { error: upErr } = await admin
              .from("sub_shifts")
              .update({ capacity: newSpec.capacity })
              .eq("id", existing.id);
            if (upErr) throw upErr;
          }
          // If capacity is the same, do nothing - don't touch the sub_shift
        } else {
          // Insert new sub_shift only if it's completely new
          const { error: insErr } = await admin.from("sub_shifts").insert({
            event_id: id,
            ...newSpec,
          });
          if (insErr) throw insErr;
        }
      }
    }
    // If sub_shifts is not provided, leave existing ones alone

    return NextResponse.json({ id, title, start_time, end_time, capacity: 0 });
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
