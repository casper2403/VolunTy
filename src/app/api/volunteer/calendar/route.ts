import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const admin = adminClient();

    // Fetch organization timezone from settings
    const { data: settings } = await admin
      .from("settings")
      .select("timezone")
      .single();
    const timezone = settings?.timezone || "Europe/Brussels";

    // Lookup user by calendar token
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id,full_name")
      .eq("calendar_token", token)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Fetch user's assignments with event details
    const { data: assignments, error: assignErr } = await admin
      .from("shift_assignments")
      .select(
        "id,status,sub_shifts(id,role_name,start_time,end_time,events!sub_shifts_event_id_fkey(id,title,start_time,end_time,location))"
      )
      .eq("user_id", profile.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    if (assignErr) throw assignErr;

    // Build iCalendar format (RFC 5545)
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const events: string[] = [];

    const parseDateTime = (dateStr: string, tz: string) => {
      if (!dateStr) return "";
      
      // Parse as a UTC moment
      const date = new Date(dateStr);
      
      // Calculate timezone offset for this specific date
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(date);
      
      const lookup: { [key: string]: string } = {};
      parts.forEach(part => {
        if (part.type !== "literal") lookup[part.type] = part.value;
      });
      
      // Calculate offset between timezone and UTC
      const tzAsUTC = Date.UTC(
        Number(lookup.year),
        Number(lookup.month) - 1,
        Number(lookup.day),
        Number(lookup.hour),
        Number(lookup.minute),
        Number(lookup.second)
      );
      
      const offset = tzAsUTC - date.getTime();
      const utcDate = new Date(date.getTime() + offset);
      
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(utcDate.getUTCDate())}T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}${pad(utcDate.getUTCSeconds())}Z`;
    };

    (assignments ?? []).forEach((row: any) => {
      const sub = row.sub_shifts;
      const evt = sub?.events;

      if (!evt || !sub) return;

      const startTime = parseDateTime(sub.start_time || evt.start_time || "", timezone);
      const endTime = parseDateTime(sub.end_time || evt.end_time || "", timezone);

      if (!startTime || !endTime) return;

      const uid = `shift-${row.id}@volunty.local`;
      const title = `${evt.title} - ${sub.role_name}`;
      const description = `Role: ${sub.role_name}${evt.location ? `\nLocation: ${evt.location}` : ""}`;
      const location = evt.location || "";

      events.push(`BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${escapeCalendarText(title)}
DESCRIPTION:${escapeCalendarText(description)}
LOCATION:${escapeCalendarText(location)}
STATUS:CONFIRMED
END:VEVENT`);
    });

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VolunTy//Calendar Feed//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeCalendarText(`${profile.full_name || "Volunteer"} Shifts`)}
X-WR-TIMEZONE:UTC
${events.join("\n")}
END:VCALENDAR`;

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${profile.full_name || "shifts"}.ics"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to generate calendar" }, { status: 500 });
  }
}

function escapeCalendarText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .substring(0, 1000); // Limit length
}
