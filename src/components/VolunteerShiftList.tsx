"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, User, ArrowRightLeft, CheckCircle, Link as LinkIcon, Copy, X, AlertCircle, Check, Trash2 } from "lucide-react";

type AvailableShift = {
  id: string;
  eventTitle: string;
  eventId: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  startISO: string;
  endISO: string;
  location?: string;
  spotsFilled: number;
  capacity: number;
  available: number;
};

type EventGroup = {
  id: string;
  title: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  subShifts: AvailableShift[];
};

type MyShift = {
  id: string;
  assignmentId: string;
  eventId: string;
  eventTitle: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  startISO: string;
  endISO: string;
  location?: string;
  status: "confirmed" | "pending_swap";
};

type SwapRequest = {
  id: string;
  status: "open" | "accepted";
  created_at: string;
  share_token: string;
  event_id?: string;
  requester_id?: string;
  is_mine?: boolean;
  role_name: string;
  start_time: string;
  end_time: string;
  event_title: string;
  event_location: string | null;
  share_link: string;
};

type VolunteerShiftListProps = {
  activeTab: "my-shifts" | "open-shifts";
};

export default function VolunteerShiftList({ activeTab }: VolunteerShiftListProps) {
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [availableByEvent, setAvailableByEvent] = useState<EventGroup[]>([]);
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copiedSwap, setCopiedSwap] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, assignmentsRes, tokenRes, swapsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/volunteer/assignments"),
        fetch("/api/volunteer/assignments/token"),
        fetch("/api/volunteer/swap-requests"),
      ]);
        // Build available shifts from events and group by event
        let shifts: AvailableShift[] = [];
        let grouped: Record<string, EventGroup> = {};
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          data.forEach((evt: any) => {
            (evt.sub_shifts ?? []).forEach((s: any, idx: number) => {
              const start = s.start_time ?? evt.start_time;
              const end = s.end_time ?? evt.end_time;
              shifts.push({
                id: s.id || `${evt.id}-${idx}`,
                eventId: evt.id,
                eventTitle: evt.title,
                role: s.role_name,
                date: start?.slice(0, 10),
                startTime: start?.slice(11, 16),
                endTime: end?.slice(11, 16),
                startISO: start,
                endISO: end,
                location: evt.location,
                spotsFilled: s.filled ?? 0,
                capacity: s.capacity ?? 0,
                available: Math.max((s.available ?? ((s.capacity ?? 0) - (s.filled ?? 0))), 0),
              });
            });
          });
        }

        // Map my assignments and filter available shifts to hide already accepted sub_shifts
        if (assignmentsRes.ok) {
          const my = await assignmentsRes.json();
          const mapped: MyShift[] = my.map((row: any) => {
            // API returns flat fields; fallback to nested if present
            const sub = row.sub_shifts;
            const evtNested = Array.isArray(sub?.events) ? sub.events[0] : sub?.events;
            const start = row.start_time ?? sub?.start_time ?? evtNested?.start_time;
            const end = row.end_time ?? sub?.end_time ?? evtNested?.end_time;
            const eventId = row.event_id ?? sub?.event_id ?? evtNested?.id;
            const eventTitle = row.event_title ?? evtNested?.title;
            const eventLocation = row.event_location ?? evtNested?.location;
            const roleName = row.role_name ?? sub?.role_name;

            return {
              id: row.sub_shift_id ?? row.id,
              assignmentId: row.id,
              eventId,
              eventTitle,
              role: roleName,
              date: start?.slice(0, 10),
              startTime: start?.slice(11, 16),
              endTime: end?.slice(11, 16),
              startISO: start,
              endISO: end,
              location: eventLocation,
              status: row.status,
            };
          });
          setMyShifts(mapped);
          const mySubShiftIds = new Set(mapped.map((m) => m.id));
          const filtered = shifts.filter((s) => s.available > 0 && !mySubShiftIds.has(s.id));

          // regroup filtered shifts by event
          const groupedEvents: Record<string, EventGroup> = {};
          filtered.forEach((s) => {
            if (!groupedEvents[s.eventId]) {
              groupedEvents[s.eventId] = {
                id: s.eventId,
                title: s.eventTitle,
                location: s.location,
                start_time: s.startISO,
                end_time: s.endISO,
                subShifts: [],
              };
            }
            groupedEvents[s.eventId].subShifts.push(s);
          });

          // sort subshifts by start time, then by end time
          Object.values(groupedEvents).forEach((g) => {
            g.subShifts.sort((a, b) => {
              const aStart = a.startISO || "";
              const bStart = b.startISO || "";
              const startCompare = aStart.localeCompare(bStart);
              if (startCompare !== 0) return startCompare;
              const aEnd = a.endISO || "";
              const bEnd = b.endISO || "";
              return aEnd.localeCompare(bEnd);
            });
          });

          setAvailableShifts(filtered);
          setAvailableByEvent(Object.values(groupedEvents));
        } else {
          // Fallback: if assignments failed to load, just set computed available shifts
          const filtered = shifts.filter((s) => s.available > 0);
          const groupedEvents: Record<string, EventGroup> = {};
          filtered.forEach((s) => {
            if (!groupedEvents[s.eventId]) {
              groupedEvents[s.eventId] = {
                id: s.eventId,
                title: s.eventTitle,
                location: s.location,
                start_time: s.startISO,
                end_time: s.endISO,
                subShifts: [],
              };
            }
            groupedEvents[s.eventId].subShifts.push(s);
          });
          Object.values(groupedEvents).forEach((g) => {
            g.subShifts.sort((a, b) => {
              const aStart = a.startISO || "";
              const bStart = b.startISO || "";
              const startCompare = aStart.localeCompare(bStart);
              if (startCompare !== 0) return startCompare;
              const aEnd = a.endISO || "";
              const bEnd = b.endISO || "";
              return aEnd.localeCompare(bEnd);
            });
          });
          setAvailableShifts(filtered);
          setAvailableByEvent(Object.values(groupedEvents));
        }

        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          setCalendarToken(token);
        }

        if (swapsRes.ok) {
          const swaps = await swapsRes.json();
          setSwapRequests(swaps);
        }
    } finally {
      setLoading(false);
    }
  };

  // Determine if an available shift overlaps with any of the user's current shifts
  const isOverlapping = (shift: AvailableShift) => {
    const aStart = shift.startISO ? new Date(shift.startISO).getTime() : NaN;
    const aEnd = shift.endISO ? new Date(shift.endISO).getTime() : NaN;
    if (!Number.isFinite(aStart) || !Number.isFinite(aEnd)) return false;
    return myShifts.some((ms) => {
      if (ms.status !== "confirmed" && ms.status !== "pending_swap") return false;
      const bStart = ms.startISO ? new Date(ms.startISO).getTime() : NaN;
      const bEnd = ms.endISO ? new Date(ms.endISO).getTime() : NaN;
      if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) return false;
      // Overlap if times intersect
      return aStart < bEnd && bStart < aEnd;
    });
  };

  // Convert ISO datetime to absolute minutes, considering the date
  const toAbsoluteMinutes = (iso?: string, referenceDate?: string): number | null => {
    if (!iso) return null;
    // Parse date (YYYY-MM-DD) and time (HH:MM:SS)
    const dateStr = iso.slice(0, 10); // "2025-12-29"
    const hh = Number(iso.slice(11, 13));
    const mm = Number(iso.slice(14, 16));
    
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    
    // If no reference date, use the date from this ISO string
    const ref = referenceDate || dateStr;
    
    // Calculate days difference
    const refDate = new Date(ref + "T00:00:00Z");
    const curDate = new Date(dateStr + "T00:00:00Z");
    const daysDiff = Math.floor((curDate.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return daysDiff * 24 * 60 + hh * 60 + mm;
  };

  // Parse HH:MM from ISO string without applying local timezone offset
  const toMinutes = (iso?: string) => {
    if (!iso) return null;
    const hh = Number(iso.slice(11, 13));
    const mm = Number(iso.slice(14, 16));
    if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
    const d = new Date(iso);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  };

  // Assign shifts to horizontal lanes based on overlaps
  const assignLanes = (
    shifts: { startISO?: string; endISO?: string }[],
    refDate: string
  ): (number | null)[] => {
    const lanes: (number | null)[] = [];
    
    shifts.forEach((shift) => {
      const startM = toAbsoluteMinutes(shift.startISO, refDate);
      const endM = toAbsoluteMinutes(shift.endISO, refDate);
      
      if (startM === null || endM === null) {
        lanes.push(null);
        return;
      }
      
      // Find first available lane (lane where this shift doesn't overlap with any existing shift)
      let assignedLane = 0;
      let assigned = false;
      
      for (let lane = 0; lane <= shifts.length; lane++) {
        let canUse = true;
        
        // Check if this shift overlaps with any shift already in this lane
        shifts.forEach((otherShift, otherIdx) => {
          if (otherIdx >= shifts.indexOf(shift)) return; // Only check shifts processed so far
          if (lanes[otherIdx] !== lane) return; // Not in this lane
          
          const otherStart = toAbsoluteMinutes(otherShift.startISO, refDate);
          const otherEnd = toAbsoluteMinutes(otherShift.endISO, refDate);
          
          if (otherStart !== null && otherEnd !== null) {
            // Check if shifts overlap (with 1-minute tolerance for adjacent shifts)
            if (startM < otherEnd && endM > otherStart) {
              canUse = false;
            }
          }
        });
        
        if (canUse) {
          assignedLane = lane;
          assigned = true;
          break;
        }
      }
      
      lanes.push(assigned ? assignedLane : 0);
    });
    
    return lanes;
  };

  const buildTimeline = (ranges: { startISO?: string; endISO?: string }[]) => {
    // Find the earliest date to use as reference
    const allDates = ranges
      .map((s) => s.startISO?.slice(0, 10))
      .filter((d): d is string => !!d);
    const refDate = allDates.length > 0 ? allDates.sort()[0] : "2025-12-28";
    
    const mins = ranges
      .map((s) => {
        const startM = toAbsoluteMinutes(s.startISO, refDate);
        const endM = toAbsoluteMinutes(s.endISO, refDate);
        return [startM, endM];
      })
      .filter(([a, b]) => a !== null && b !== null) as [number, number][];
    if (!mins.length) return { start: 0, end: 0, ticks: [], scale: 1, refDate, lanes: [] };
    const rawStart = Math.min(...mins.map(([a]) => a));
    const rawEnd = Math.max(...mins.map(([, b]) => b));
    const start = Math.floor(rawStart / 30) * 30; // round to 30-min slots
    const end = Math.ceil(rawEnd / 30) * 30;
    const ticks: number[] = [];
    for (let t = start; t <= end; t += 60) ticks.push(t);
    const scale = 1.1; // px per minute
    const lanes = assignLanes(ranges, refDate);
    const maxLane = Math.max(...lanes.filter((l) => l !== null)) + 1 || 1;
    return { start, end, ticks, scale, refDate, lanes, maxLane };
  };

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSignup = async (shiftId: string) => {
    const shiftToMove = availableShifts.find((s) => s.id === shiftId);
    if (!shiftToMove) return;

    const res = await fetch("/api/volunteer/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub_shift_id: shiftId }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Unable to sign up" }));
      showFeedback(error ?? "Unable to sign up for this shift.", "error");
      return;
    }

    const saved = await res.json();

    setAvailableShifts((prev) => prev.filter((s) => s.id !== shiftId));
    setAvailableByEvent((prev) =>
      prev
        .map((evt) => ({
          ...evt,
          subShifts: evt.subShifts.filter((s) => s.id !== shiftId),
        }))
        .filter((evt) => evt.subShifts.length > 0)
    );

    setMyShifts([
      ...myShifts,
      {
        id: saved.sub_shift_id ?? shiftToMove.id,
        assignmentId: saved.id,
        eventId: shiftToMove.eventId,
        eventTitle: saved.event_title ?? shiftToMove.eventTitle,
        role: saved.role_name ?? shiftToMove.role,
        date: shiftToMove.date,
        startTime: shiftToMove.startTime,
        endTime: shiftToMove.endTime,
        startISO: shiftToMove.startISO,
        endISO: shiftToMove.endISO,
        location: saved.event_location ?? shiftToMove.location,
        status: saved.status ?? "confirmed",
      },
    ]);

    showFeedback(`Signed up for ${shiftToMove.role} at ${shiftToMove.eventTitle}.`, "success");
  };

  const handleSwapRequest = async (assignmentId: string) => {
    try {
      const res = await fetch("/api/volunteer/swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to create swap request" }));
        showFeedback(error ?? "Failed to create swap request", "error");
        return;
      }

      const { share_link } = await res.json();

      // Reload data to get updated status from server
      await loadData();

      showFeedback("Swap request created. Copy the link to share it.", "success");
    } catch (e) {
      showFeedback("Failed to create swap request", "error");
    }
  };

  const copySwapLink = (link: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${link}`);
    setCopiedSwap(id);
    setTimeout(() => setCopiedSwap(null), 2000);
  };

  const cancelSwapRequest = async (id: string) => {
    try {
      const res = await fetch("/api/volunteer/swap-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      
      // Reload data to get updated status from server
      await loadData();
      showFeedback("Swap request cancelled", "success");
    } catch (e: any) {
      showFeedback("Failed to cancel swap request", "error");
    }
  };

  const copyFeedUrl = () => {
    if (!calendarToken) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const feedUrl = `${origin}/api/volunteer/calendar?token=${calendarToken}`;
    navigator.clipboard.writeText(feedUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const calendarFeedUrl = calendarToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/volunteer/calendar?token=${calendarToken}`
    : "";

  const mySwapRequests = swapRequests.filter((r) => r.is_mine);

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-lg px-4 py-3 shadow-lg border text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}
      {activeTab === "my-shifts" && (
        <>
          {/* Calendar Sync Section */}
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900">Sync to Your Calendar</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Subscribe to your shift calendar in Google Calendar, Apple Calendar, Outlook, or any calendar app.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCalendarModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <LinkIcon className="h-4 w-4" />
                Set Up
              </button>
            </div>
          </section>

      {/* Calendar Sync Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Subscribe to Calendar</h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Feed URL */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Calendar Feed URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={calendarFeedUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-600"
                  />
                  <button
                    onClick={copyFeedUrl}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {copyFeedback ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Google Calendar</h4>
                  <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open Google Calendar</li>
                    <li>Click <span className="font-mono bg-slate-100 px-1 rounded">+</span> next to "Other calendars"</li>
                    <li>Select "Subscribe to calendar"</li>
                    <li>Paste the URL above and click "Subscribe"</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Apple Calendar / iCal</h4>
                  <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open Calendar app</li>
                    <li>Go to File → New Calendar Subscription</li>
                    <li>Paste the URL above</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">Outlook / Microsoft 365</h4>
                  <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open Outlook Calendar</li>
                    <li>Click "Add calendar" → "Subscribe from web"</li>
                    <li>Paste the URL above</li>
                  </ol>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-900">
                    <strong>Keep your URL private.</strong> Anyone with this URL can see your calendar. Don't share it publicly or commit it to version control.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCalendarModal(false)}
                className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

          {/* My Schedule Section */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              My Schedule
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myShifts.length === 0 ? (
                <p className="text-slate-500 italic col-span-full">
                  You have no upcoming shifts.
                </p>
              ) : (
                myShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden"
                  >
                    {shift.status === "pending_swap" && (
                      <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-bl-lg">
                        Swap Requested
                      </div>
                    )}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {shift.eventTitle}
                      </h3>
                      <p className="text-blue-600 font-medium">{shift.role}</p>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{shift.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>
                    </div>
                    {shift.status === "confirmed" && (
                      <button
                        onClick={() => handleSwapRequest(shift.assignmentId)}
                        className="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Request Swap
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Swap Requests Section */}
          {mySwapRequests.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                My Swap Requests
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mySwapRequests.map((req) => {
                  const accepted = req.status === "accepted";
                  return (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden"
                  >
                    {req.status === "open" && (
                      <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-bl-lg">
                        Open
                      </div>
                    )}
                    {req.status === "accepted" && (
                      <div className="absolute top-0 right-0 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-bl-lg">
                        Accepted
                      </div>
                    )}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {req.event_title}
                      </h3>
                      <p className="text-blue-600 font-medium">{req.role_name}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{req.start_time?.slice(0, 10)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {req.start_time?.slice(11, 16)} - {req.end_time?.slice(11, 16)}
                        </span>
                      </div>
                    </div>

                    {req.status === "open" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-slate-100 rounded p-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}${req.share_link}`}
                            className="flex-1 bg-transparent text-sm text-slate-600 outline-none"
                          />
                          <button
                            onClick={() => copySwapLink(req.share_link, req.id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            {copiedSwap === req.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-slate-600" />
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => cancelSwapRequest(req.id)}
                          className="w-full text-sm px-3 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancel Request
                        </button>
                      </div>
                    )}

                    {req.status === "accepted" && (
                      <div className="text-sm text-green-800 font-semibold">✓ Swap accepted</div>
                    )}
                  </div>
                );})}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === "open-shifts" && (
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Available Opportunities
          </h2>

          {availableByEvent.length === 0 ? (
            <p className="text-slate-500 italic">No available shifts at the moment.</p>
          ) : (
            <div className="space-y-4">
              {availableByEvent.map((evt) => {
                const allConflicts = evt.subShifts.every((s) => isOverlapping(s));
                const anyAvailable = evt.subShifts.some((s) => !isOverlapping(s));
                return (
                  <div
                    key={evt.id}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEventId((prev) => (prev === evt.id ? null : evt.id))}
                      className="w-full flex items-start justify-between gap-4 p-4 hover:bg-slate-50 text-left"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-500">Event</span>
                        <span className="text-lg font-semibold text-slate-900">{evt.title}</span>
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{evt.start_time?.slice(0, 10)}</span>
                          <Clock className="h-4 w-4 ml-3" />
                          <span>
                            {evt.start_time?.slice(11, 16)} - {evt.end_time?.slice(11, 16)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!anyAvailable && (
                          <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">
                            All conflicts
                          </span>
                        )}
                        {anyAvailable && (
                          <span className="rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
                            {evt.subShifts.length} sub-shifts
                          </span>
                        )}
                        <span className="text-sm text-slate-500">
                          {expandedEventId === evt.id ? "Hide" : "Show"}
                        </span>
                      </div>
                    </button>

                    {expandedEventId === evt.id && (
                      <div className="border-t border-slate-200 p-4">
                        {(() => {
                          const acceptedBlocks = swapRequests.filter(
                            (r) => r.status === "accepted" && r.event_id === evt.id
                          );
                          const openBlocks = swapRequests.filter(
                            (r) => r.status === "open" && r.event_id === evt.id
                          );
                          const myBlocks = myShifts.filter((m) => m.eventId === evt.id);
                          const meta = buildTimeline([
                            ...evt.subShifts,
                            ...acceptedBlocks.map((r) => ({ startISO: r.start_time, endISO: r.end_time })),
                            ...openBlocks.map((r) => ({ startISO: r.start_time, endISO: r.end_time })),
                            ...myBlocks.map((m) => ({ startISO: m.startISO, endISO: m.endISO })),
                          ]);
                          const totalHeight = Math.max(meta.end - meta.start, 60) * meta.scale;
                          return (
                            <div className="flex gap-4">
                              {/* Time ruler */}
                              <div className="w-16 text-right text-xs text-slate-500 relative" style={{ height: `${totalHeight}px` }}>
                                {meta.ticks.map((t) => {
                                  const top = (t - meta.start) * meta.scale;
                                  const hours = (Math.floor(t / 60) % 24)
                                    .toString()
                                    .padStart(2, "0");
                                  const mins = (t % 60).toString().padStart(2, "0");
                                  return (
                                    <div key={t} className="absolute" style={{ top }}>
                                      {hours}:{mins}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Timeline */}
                              <div className="flex-1 relative overflow-x-auto" style={{ height: `${totalHeight}px` }}>
                                {/* horizontal grid lines */}
                                {meta.ticks.map((t) => {
                                  const top = (t - meta.start) * meta.scale;
                                  return (
                                    <div
                                      key={`line-${t}`}
                                      className="absolute left-0 right-0 border-t border-slate-100"
                                      style={{ top, minWidth: "100%" }}
                                    />
                                  );
                                })}

                                {/* Container for all lanes to expand horizontally if needed */}
                                <div style={{ minWidth: `${Math.max((meta.maxLane ?? 1) * 260, 300)}px`, height: "100%", position: "relative" }}>
                                  {evt.subShifts.map((shift, idx) => {
                                    const conflict = isOverlapping(shift);
                                    const startM = toAbsoluteMinutes(shift.startISO, meta.refDate) ?? meta.start;
                                    const endM = toAbsoluteMinutes(shift.endISO, meta.refDate) ?? meta.start;
                                    const top = (startM - meta.start) * meta.scale;
                                    const durationMins = endM - startM;
                                    const height = Math.max(durationMins * meta.scale, 48);
                                    const lane = meta.lanes[idx] ?? 0;
                                    const laneWidth = 250;
                                    const laneGap = 8;
                                    const left = lane * (laneWidth + laneGap);
                                    const isVeryShort = durationMins < 120;
                                    
                                    // Minimal clickable card for shifts < 2 hours
                                    if (isVeryShort) {
                                      return (
                                        <div
                                          key={shift.id}
                                          className={`absolute rounded-lg border transition-all shadow-sm ${
                                            conflict
                                              ? "bg-rose-50 border-rose-200"
                                              : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"
                                          } flex items-center justify-between gap-2 px-2 py-1.5`}
                                          style={{
                                            top,
                                            left,
                                            width: laneWidth,
                                            height,
                                          }}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className={`font-semibold leading-tight text-xs truncate ${
                                              conflict ? "text-rose-800" : "text-slate-900"
                                            }`}>
                                              {shift.role}
                                            </div>
                                            <div className={`text-[10px] tabular-nums mt-0.5 ${
                                              conflict ? "text-rose-600" : "text-slate-600"
                                            }`}>
                                              {shift.startTime} - {shift.endTime}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleSignup(shift.id)}
                                            disabled={conflict}
                                            className={`flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium leading-tight ${
                                              conflict
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-slate-900 text-white hover:bg-slate-800"
                                            }`}
                                          >
                                            Sign<br/>Up
                                          </button>
                                        </div>
                                      );
                                    }
                                    
                                    // Full card for longer shifts
                                    return (
                                      <div
                                        key={shift.id}
                                        className={`absolute rounded-lg border transition-all shadow-sm ${
                                          conflict
                                            ? "bg-rose-50 border-rose-200"
                                            : "bg-white border-slate-200 hover:shadow-md hover:border-slate-300"
                                        }`}
                                        style={{
                                          top,
                                          left,
                                          width: laneWidth,
                                          height,
                                          display: "flex",
                                          flexDirection: "column",
                                        }}
                                      >
                                        <div className="px-3 pt-2 pb-1.5">
                                          <div className="flex items-start justify-between gap-1">
                                            <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-slate-900 leading-tight text-sm">
                                                {shift.role}
                                              </div>
                                            </div>
                                            <div className="text-slate-500 whitespace-nowrap flex-shrink-0 ml-1 text-xs">
                                              {shift.capacity - shift.spotsFilled} left
                                            </div>
                                          </div>
                                          
                                          <div className="text-slate-600 flex items-center gap-1 mt-1 text-xs">
                                            <Clock className="h-3 w-3" />
                                            <span className="tabular-nums">
                                              {shift.startTime} - {shift.endTime}
                                            </span>
                                          </div>
                                          
                                          {shift.location && height > 80 && (
                                            <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                              <MapPin className="h-3 w-3 flex-shrink-0" />
                                              <span className="truncate">{shift.location}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-end px-2 pb-2 gap-2">
                                          <button
                                            onClick={() => handleSignup(shift.id)}
                                            disabled={conflict}
                                            className={`w-full rounded-md transition-colors text-xs font-medium py-1 ${
                                              conflict
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950"
                                            }`}
                                          >
                                            Sign Up
                                          </button>
                                          {conflict && (
                                            <p className="text-[10px] text-rose-700 leading-tight text-center">Conflicts</p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {openBlocks.map((r, idx) => {
                                  const startM = toAbsoluteMinutes(r.start_time, meta.refDate) ?? meta.start;
                                  const endM = toAbsoluteMinutes(r.end_time, meta.refDate) ?? meta.start;
                                  const top = (startM - meta.start) * meta.scale;
                                  const durationMins = endM - startM;
                                  const height = Math.max(durationMins * meta.scale, 48);
                                  const laneWidth = 250;
                                  const laneGap = 8;
                                  const maxLane = meta.maxLane ?? 1;
                                  const lane = (evt.subShifts.length + idx) % maxLane;
                                  const left = lane * (laneWidth + laneGap);
                                  const mine = r.is_mine;
                                  const baseBorder = mine ? "border-amber-200" : "border-blue-200";
                                  const baseBg = mine ? "bg-amber-50" : "bg-blue-50";
                                  const baseText = mine ? "text-amber-900" : "text-blue-900";
                                  const accentText = mine ? "text-amber-700" : "text-blue-700";
                                  const isVeryShort = durationMins < 120;
                                  
                                  if (isVeryShort) {
                                    return (
                                      <div
                                        key={`open-${r.id}`}
                                        className={`absolute rounded-lg border ${baseBorder} ${baseBg} transition-all shadow-sm flex items-center justify-between gap-2 px-2 py-1.5`}
                                        style={{
                                          top,
                                          left,
                                          width: laneWidth,
                                          height,
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-semibold ${baseText} leading-tight text-xs truncate`}>
                                            {r.role_name}
                                          </div>
                                          <div className={`text-[10px] tabular-nums ${accentText} mt-0.5`}>
                                            {r.start_time.slice(11, 16)} - {r.end_time.slice(11, 16)}
                                          </div>
                                        </div>
                                        <div className={`flex-shrink-0 text-[9px] ${accentText} font-medium px-1.5 py-0.5 rounded border ${baseBorder}`}>
                                          {mine ? "Swap" : "Open"}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={`open-${r.id}`}
                                      className={`absolute rounded-lg border ${baseBorder} ${baseBg} transition-all shadow-sm`}
                                      style={{
                                        top,
                                        left,
                                        width: laneWidth,
                                        height,
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      <div className="px-3 pt-2 pb-1.5">
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex-1 min-w-0">
                                            <div className={`font-semibold ${baseText} leading-tight text-sm`}>
                                              {r.role_name}
                                            </div>
                                          </div>
                                          <div className={`${accentText} whitespace-nowrap flex-shrink-0 ml-1 text-xs`}>
                                            {mine ? "Swap" : "Open"}
                                          </div>
                                        </div>
                                        <div className={`${accentText} flex items-center gap-1 mt-1 text-xs`}>
                                          <Clock className="h-3 w-3" />
                                          <span className="tabular-nums">
                                            {r.start_time.slice(11, 16)} - {r.end_time.slice(11, 16)}
                                          </span>
                                        </div>
                                        {r.event_location && height > 80 && (
                                          <div className={`text-xs ${accentText} flex items-center gap-1 mt-1`}>
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{r.event_location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {myBlocks.map((m, idx) => {
                                  const startM = toAbsoluteMinutes(m.startISO, meta.refDate) ?? meta.start;
                                  const endM = toAbsoluteMinutes(m.endISO, meta.refDate) ?? meta.start;
                                  const top = (startM - meta.start) * meta.scale;
                                  const durationMins = endM - startM;
                                  const height = Math.max(durationMins * meta.scale, 48);
                                  const laneWidth = 250;
                                  const laneGap = 8;
                                  const maxLane = meta.maxLane ?? 1;
                                  const lane = (evt.subShifts.length + openBlocks.length + idx) % maxLane;
                                  const left = lane * (laneWidth + laneGap);
                                  const pending = m.status === "pending_swap";
                                  const baseBorder = pending ? "border-amber-300" : "border-green-300";
                                  const baseBg = pending ? "bg-amber-50" : "bg-green-50";
                                  const baseText = pending ? "text-amber-900" : "text-green-900";
                                  const accentText = pending ? "text-amber-800" : "text-green-800";
                                  const isVeryShort = durationMins < 120;
                                  
                                  if (isVeryShort) {
                                    return (
                                      <div
                                        key={`my-${m.assignmentId}`}
                                        className={`absolute rounded-lg border ${baseBorder} ${baseBg} transition-all shadow-sm flex items-center justify-between gap-2 px-2 py-1.5`}
                                        style={{
                                          top,
                                          left,
                                          width: laneWidth,
                                          height,
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-semibold ${baseText} leading-tight text-xs truncate`}>
                                            {m.role}
                                          </div>
                                          <div className={`text-[10px] tabular-nums ${accentText} mt-0.5`}>
                                            {m.startTime} - {m.endTime}
                                          </div>
                                        </div>
                                        <div className={`flex-shrink-0 text-[9px] ${accentText} font-medium px-1.5 py-0.5 rounded border ${baseBorder}`}>
                                          {pending ? "Swap" : "Mine"}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={`my-${m.assignmentId}`}
                                      className={`absolute rounded-lg border ${baseBorder} ${baseBg} transition-all shadow-sm`}
                                      style={{
                                        top,
                                        left,
                                        width: laneWidth,
                                        height,
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      <div className="px-3 pt-2 pb-1.5">
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex-1 min-w-0">
                                            <div className={`font-semibold ${baseText} leading-tight text-sm`}>
                                              {m.role}
                                            </div>
                                          </div>
                                          <div className={`${accentText} whitespace-nowrap flex-shrink-0 ml-1 text-xs`}>
                                            {pending ? "Swap req" : "My shift"}
                                          </div>
                                        </div>
                                        <div className={`${accentText} flex items-center gap-1 mt-1 text-xs`}>
                                          <Clock className="h-3 w-3" />
                                          <span className="tabular-nums">
                                            {m.startTime} - {m.endTime}
                                          </span>
                                        </div>
                                        {m.location && height > 80 && (
                                          <div className={`text-xs ${accentText} flex items-center gap-1 mt-1`}>
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{m.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {acceptedBlocks.map((r, idx) => {
                                  const startM = toAbsoluteMinutes(r.start_time, meta.refDate) ?? meta.start;
                                  const endM = toAbsoluteMinutes(r.end_time, meta.refDate) ?? meta.start;
                                  const top = (startM - meta.start) * meta.scale;
                                  const durationMins = endM - startM;
                                  const height = Math.max(durationMins * meta.scale, 48);
                                  const laneWidth = 250;
                                  const laneGap = 8;
                                  const maxLane = meta.maxLane ?? 1;
                                  const lane = (evt.subShifts.length + openBlocks.length + myBlocks.length + idx) % maxLane;
                                  const left = lane * (laneWidth + laneGap);
                                  const isVeryShort = durationMins < 120;
                                  
                                  if (isVeryShort) {
                                    return (
                                      <div
                                        key={`accepted-${r.id}`}
                                        className="absolute rounded-lg border border-emerald-300 bg-emerald-50 transition-all shadow-sm flex items-center justify-between gap-2 px-2 py-1.5"
                                        style={{
                                          top,
                                          left,
                                          width: laneWidth,
                                          height,
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-emerald-900 leading-tight text-xs truncate">
                                            {r.role_name}
                                          </div>
                                          <div className="text-[10px] tabular-nums text-emerald-800 mt-0.5">
                                            {r.start_time.slice(11, 16)} - {r.end_time.slice(11, 16)}
                                          </div>
                                        </div>
                                        <div className="flex-shrink-0 text-[9px] text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-300">
                                          Accept
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={`accepted-${r.id}`}
                                      className="absolute rounded-lg border border-emerald-300 bg-emerald-50 transition-all shadow-sm"
                                      style={{
                                        top,
                                        left,
                                        width: laneWidth,
                                        height,
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      <div className="px-3 pt-2 pb-1.5">
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-emerald-900 leading-tight text-sm">
                                              {r.role_name}
                                            </div>
                                          </div>
                                          <div className="text-emerald-700 whitespace-nowrap flex-shrink-0 ml-1 text-xs">
                                            Accept
                                          </div>
                                        </div>
                                        <div className="text-emerald-800 flex items-center gap-1 mt-1 text-xs">
                                          <Clock className="h-3 w-3" />
                                          <span className="tabular-nums">
                                            {r.start_time.slice(11, 16)} - {r.end_time.slice(11, 16)}
                                          </span>
                                        </div>
                                        {r.event_location && height > 80 && (
                                          <div className="text-xs text-emerald-800 flex items-center gap-1 mt-1">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{r.event_location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
