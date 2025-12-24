"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, User, ArrowRightLeft, CheckCircle, Link as LinkIcon, Copy, X, AlertCircle, Check, Trash2 } from "lucide-react";

type AvailableShift = {
  id: string;
  eventTitle: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  spotsFilled: number;
  capacity: number;
  available: number;
};

type MyShift = {
  id: string;
  assignmentId: string;
  eventTitle: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: "confirmed" | "pending_swap";
};

type SwapRequest = {
  id: string;
  status: "open" | "accepted";
  created_at: string;
  share_token: string;
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
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copiedSwap, setCopiedSwap] = useState<string | null>(null);

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

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const shifts: AvailableShift[] = [];
          data.forEach((evt: any) => {
            (evt.sub_shifts ?? []).forEach((s: any, idx: number) => {
              const start = s.start_time ?? evt.start_time;
              const end = s.end_time ?? evt.end_time;
              shifts.push({
                id: s.id || `${evt.id}-${idx}`,
                eventTitle: evt.title,
                role: s.role_name,
                date: start?.slice(0, 10),
                startTime: start?.slice(11, 16),
                endTime: end?.slice(11, 16),
                location: evt.location,
                spotsFilled: s.filled ?? 0,
                capacity: s.capacity ?? 0,
                available: Math.max((s.available ?? ((s.capacity ?? 0) - (s.filled ?? 0))), 0),
              });
            });
          });
          setAvailableShifts(shifts.filter((s) => s.available > 0));
        }

        if (assignmentsRes.ok) {
          const my = await assignmentsRes.json();
          const mapped: MyShift[] = my.map((row: any) => {
            const start = row.start_time ?? row.event_start_time;
            const end = row.end_time ?? row.event_end_time;
            return {
              id: row.sub_shift_id ?? row.id,
              assignmentId: row.id,
              eventTitle: row.event_title,
              role: row.role_name,
              date: start?.slice(0, 10),
              startTime: start?.slice(11, 16),
              endTime: end?.slice(11, 16),
              location: row.event_location,
              status: row.status,
            };
          });
          setMyShifts(mapped);
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
      alert(error ?? "Unable to sign up for this shift.");
      return;
    }

    const saved = await res.json();

    setAvailableShifts((prev) => {
      return prev
        .map((s) =>
          s.id === shiftId
            ? { ...s, spotsFilled: s.spotsFilled + 1, available: Math.max(s.available - 1, 0) }
            : s
        )
        .filter((s) => s.available > 0);
    });

    setMyShifts([
      ...myShifts,
      {
        id: saved.sub_shift_id ?? shiftToMove.id,
        assignmentId: saved.id,
        eventTitle: saved.event_title ?? shiftToMove.eventTitle,
        role: saved.role_name ?? shiftToMove.role,
        date: shiftToMove.date,
        startTime: shiftToMove.startTime,
        endTime: shiftToMove.endTime,
        location: saved.event_location ?? shiftToMove.location,
        status: saved.status ?? "confirmed",
      },
    ]);

    alert(`Successfully signed up for ${shiftToMove.role} at ${shiftToMove.eventTitle}!`);
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
        alert(error ?? "Failed to create swap request");
        return;
      }

      const { share_link } = await res.json();

      // Reload data to get updated status from server
      await loadData();

      alert(`Swap request created! Share this link with other volunteers:\n\n${window.location.origin}${share_link}`);
    } catch (e) {
      alert("Failed to create swap request");
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
    } catch (e: any) {
      alert("Failed to cancel swap request");
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

  return (
    <div className="space-y-8">
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
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{shift.location}</span>
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
          {swapRequests.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                My Swap Requests
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {swapRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {req.event_title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {req.role_name}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          req.status === "open"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-slate-600">
                      <p>
                        📅 {new Date(req.start_time).toLocaleDateString()} •{" "}
                        {new Date(req.start_time).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(req.end_time).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {req.event_location && <p>📍 {req.event_location}</p>}
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
                      <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                        ✓ Swap accepted!
                      </div>
                    )}
                  </div>
                ))}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableShifts.length === 0 ? (
              <p className="text-slate-500 italic col-span-full">
                No available shifts at the moment.
              </p>
            ) : (
              availableShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">
                        {shift.eventTitle}
                      </h3>
                      <p className="text-slate-500 text-sm">{shift.role}</p>
                    </div>
                    <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {shift.capacity - shift.spotsFilled} spots left
                    </span>
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
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{shift.location}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSignup(shift.id)}
                    className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
