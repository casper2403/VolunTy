"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, User, ArrowRightLeft, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

type MyShift = {
  id: string;
  eventTitle: string;
  role: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: "confirmed" | "pending_swap";
};

export default function VolunteerShiftList() {
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/events");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const shifts: AvailableShift[] = [];
      data.forEach((evt: any) => {
        (evt.sub_shifts ?? []).forEach((s: any, idx: number) => {
          shifts.push({
            id: s.id || `${evt.id}-${idx}`,
            eventTitle: evt.title,
            role: s.role_name,
            date: (s.start_time ?? evt.start_time).slice(0, 10),
            startTime: (s.start_time ?? evt.start_time).slice(11, 16),
            endTime: (s.end_time ?? evt.end_time).slice(11, 16),
            spotsFilled: 0,
            capacity: s.capacity ?? 0,
          });
        });
      });
      setAvailableShifts(shifts);
      setLoading(false);
    };
    load();
  }, []);

  const handleSignup = (shiftId: string) => {
    const shiftToMove = availableShifts.find((s) => s.id === shiftId);
    if (!shiftToMove) return;

    // Remove from available
    setAvailableShifts(availableShifts.filter((s) => s.id !== shiftId));

    // Add to my shifts
    setMyShifts([
      ...myShifts,
      {
        id: shiftToMove.id,
        eventTitle: shiftToMove.eventTitle,
        role: shiftToMove.role,
        date: shiftToMove.date,
        startTime: shiftToMove.startTime,
        endTime: shiftToMove.endTime,
        location: shiftToMove.location,
        status: "confirmed",
      },
    ]);

    alert(`Successfully signed up for ${shiftToMove.role} at ${shiftToMove.eventTitle}!`);
  };

  const handleSwapRequest = (shiftId: string) => {
    setMyShifts(
      myShifts.map((s) =>
        s.id === shiftId ? { ...s, status: "pending_swap" } : s
      )
    );
    alert("Swap request submitted! Other volunteers can now pick up this shift.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
                    onClick={() => handleSwapRequest(shift.id)}
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

      {/* Available Opportunities Section */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Available Opportunities
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableShifts.map((shift) => (
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
          ))}
        </div>
      </section>
    </div>
  );
}
