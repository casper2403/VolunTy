/**
 * Timezone utility functions
 * Handles date conversions for the organization's configured timezone
 */

// Get timezone from settings (defaults to Europe/Brussels)
export async function getOrganizationTimezone(): Promise<string> {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      return data.timezone || "Europe/Brussels";
    }
  } catch (error) {
    console.error("Failed to fetch timezone:", error);
  }
  return "Europe/Brussels";
}

function getTimeZoneOffset(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  });

  const asUTC = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );

  return asUTC - date.getTime();
}

/**
 * Convert a date string and time string to an ISO string.
 * Stores the time as-is in UTC format (treating the input as wall-clock time).
 */
export function combineDateAndTimeInTimezone(
  date: string,
  time: string,
  timezone: string = "Europe/Brussels"
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Build UTC date with the provided wall time fields directly
  // This stores "9:00" as "09:00:00.000Z" without timezone offset
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
}

/**
 * Format a date to YYYY-MM-DD in the organization's timezone
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = "Europe/Brussels"
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Format a date to HH:MM in the organization's timezone
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string = "Europe/Brussels"
): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Parse a date in the organization's timezone, preventing off-by-one errors
 */
export function parseDate(dateStr: string, timezone: string = "Europe/Brussels"): Date {
  // When clicking a calendar date, we want to interpret it in the org timezone
  const [year, month, day] = dateStr.split("-").map(Number);
  
  // Create date at noon in the target timezone to avoid day boundary issues
  return new Date(
    new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00`).toLocaleString(
      "en-US",
      { timeZone: timezone }
    )
  );
}
