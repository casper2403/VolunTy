"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import CreateEventModal from "./CreateEventModal";
import { combineDateAndTimeInTimezone } from "@/lib/timezone";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  subShifts: {
    id: string;
    roleName: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    capacity: number;
  }[];
  capacity: number;
  filled: number;
}

export default function AdminSchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [timezone, setTimezone] = useState<string>("Europe/Brussels");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load timezone setting first
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.timezone) {
          setTimezone(data.timezone);
        }
      })
      .catch(() => {});
  }, []);

  const parseWallClockDate = (isoString: string): Date => {
    // Parse UTC time as local wall-clock time
    // "2025-12-24T09:00:00.000Z" should display as 9:00 local time
    const [year, month, day] = isoString.slice(0, 10).split('-').map(Number);
    const [hour, minute] = isoString.slice(11, 16).split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  };

  const loadEvents = async () => {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    const data = await res.json();
    const mapped: CalendarEvent[] = data.map((evt: any) => ({
      id: evt.id,
      title: evt.title,
      start: parseWallClockDate(evt.start_time),
      end: parseWallClockDate(evt.end_time),
      subShifts: (evt.sub_shifts || [])
        .sort((a: any, b: any) => {
          // Sort by start_time, then by end_time
          const aStart = a.start_time || "";
          const bStart = b.start_time || "";
          const startCompare = aStart.localeCompare(bStart);
          if (startCompare !== 0) return startCompare;
          const aEnd = a.end_time || "";
          const bEnd = b.end_time || "";
          return aEnd.localeCompare(bEnd);
        })
        .map((s: any, idx: number) => ({
          id: s.id || `${evt.id}-${idx}`,
          roleName: s.role_name,
          startDate: (s.start_time || evt.start_time)?.slice(0, 10) ?? "",
          startTime: (s.start_time || evt.start_time)?.slice(11, 16) ?? "",
          endDate: (s.end_time || evt.end_time)?.slice(0, 10) ?? "",
          endTime: (s.end_time || evt.end_time)?.slice(11, 16) ?? "",
          capacity: s.capacity ?? 0,
        })),
      capacity: evt.capacity ?? 0,
      filled: evt.filled ?? 0,
    }));
    setEvents(mapped);
  };

  useEffect(() => {
    loadEvents();
  }, [timezone]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const openCreate = (date?: Date) => {
    setEditingEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const openEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setSelectedDate(evt.start);
    setIsModalOpen(true);
  };

  const combineDateAndTime = (date: string, time: string) =>
    combineDateAndTimeInTimezone(date, time, timezone);

  const persistEvent = async (payload: any, existingId?: string): Promise<{ ok: boolean; status: number; body?: any }> => {
    if (existingId) {
      const res = await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existingId, ...payload }),
      });
      let body: any = undefined;
      try { body = await res.json(); } catch {}
      return { ok: res.ok, status: res.status, body };
    }
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body: any = undefined;
    try { body = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, body };
  };

  const handleSaveEvent = async (evt: any) => {
    setIsSaving(true);
    try {
      const { id, title, startDate, endDate, startTime, endTime, subShifts } = evt;
      
      // Generate all dates between start and end date (inclusive)
      const dates: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
      }

      if (id) {
        // For editing, only update the single event
        let payload: any = {
          title,
          start_time: `${startDate}T${startTime}:00.000Z`,
          end_time: `${endDate}T${endTime}:00.000Z`,
          sub_shifts: subShifts.map((s: any) => ({
            id: s.id,
            role_name: s.roleName,
            start_time: `${s.startDate}T${s.startTime}:00.000Z`,
            end_time: `${s.endDate}T${s.endTime}:00.000Z`,
            capacity: s.capacity,
          })),
        };
        let result = await persistEvent(payload, id);
        if (!result.ok && result.status === 409 && result.body?.assigned_sub_shifts) {
          const total = Object.values(result.body.counts || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
          const confirmMsg = `You're about to delete ${result.body.assigned_sub_shifts.length} sub-shift(s) with ${total} assignment(s).\nThis will remove assigned volunteers from these roles.\n\nDo you want to proceed?`;
          const yes = window.confirm(confirmMsg);
          if (yes) {
            payload = { ...payload, force: true };
            result = await persistEvent(payload, id);
          }
        }
        if (!result.ok) {
          const msg = result.body?.error || "Failed to save event";
          throw new Error(msg);
        }
      } else {
        // For creating, create an event for each date
        for (const dateStr of dates) {
          const payload = {
            title,
            start_time: `${dateStr}T${startTime}:00.000Z`,
            end_time: `${dateStr}T${endTime}:00.000Z`,
            sub_shifts: subShifts.map((s: any) => {
              // Only include sub-shifts that cover this date
              if (s.startDate <= dateStr && dateStr <= s.endDate) {
                return {
                  role_name: s.roleName,
                  start_time: `${dateStr}T${s.startTime}:00.000Z`,
                  end_time: `${dateStr}T${s.endTime}:00.000Z`,
                  capacity: s.capacity,
                };
              }
              return null;
            }).filter((s: any) => s !== null),
          };
          const result = await persistEvent(payload);
          if (!result.ok) {
            const msg = result.body?.error || "Failed to create event";
            throw new Error(msg);
          }
        }
      }

      await loadEvents();
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (error: any) {
      console.error("Failed to save event:", error);
      alert(error?.message || "Failed to save event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete event");
      }
      await loadEvents();
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{format(currentMonth, "MMMM yyyy")}</p>
          <h3 className="text-2xl font-bold text-slate-900">Schedule</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50"
            onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50"
            onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => openCreate(new Date())}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div key={label} className="py-2">{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const dayEvents = events.filter((evt) =>
              isWithinInterval(day, {
                start: startOfDay(evt.start),
                end: endOfDay(evt.end),
              })
            );
            const isCurrent = isSameMonth(day, currentMonth);
            return (
              <div
                key={day.toISOString()}
                onClick={() => openCreate(day)}
                className={`min-h-[120px] rounded-lg border p-2 transition hover:border-slate-300 hover:bg-slate-50 ${
                  isCurrent ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-semibold ${isCurrent ? "text-slate-900" : "text-slate-400"}`}>
                    {format(day, "d")}
                  </span>
                  <CalendarDays className="h-4 w-4 text-slate-300" />
                </div>
                <div className="mt-2 space-y-1">
                  {dayEvents.length === 0 && (
                    <p className="text-[11px] text-slate-400">No events</p>
                  )}
                  {dayEvents.map((evt) => (
                    <button
                      key={`${evt.id}-${day.toISOString()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(evt);
                      }}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-left hover:border-slate-300 hover:bg-slate-100"
                    >
                      <p className="text-xs font-semibold text-slate-900">{evt.title}</p>
                      <p className="text-[11px] text-slate-600">
                        {format(evt.start, "HH:mm")} - {format(evt.end, "HH:mm")}
                      </p>
                      <p className="text-[11px] text-slate-500">{evt.filled}/{evt.capacity} staffed</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSaving) {
            setIsModalOpen(false);
            setEditingEvent(null);
          }
        }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        initialDate={selectedDate}
        initialEvent={editingEvent ? {
          id: editingEvent.id,
          title: editingEvent.title,
          start: editingEvent.start,
          end: editingEvent.end,
          subShifts: editingEvent.subShifts,
        } : undefined}
        timezone={timezone}
        isSaving={isSaving}
      />
    </div>
  );
}
