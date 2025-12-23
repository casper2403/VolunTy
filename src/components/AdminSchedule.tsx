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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  subShifts: {
    id: string;
    roleName: string;
    startTime: string;
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

  const loadEvents = async () => {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    const data = await res.json();
    const mapped: CalendarEvent[] = data.map((evt: any) => ({
      id: evt.id,
      title: evt.title,
      start: new Date(evt.start_time),
      end: new Date(evt.end_time),
      subShifts: (evt.sub_shifts || []).map((s: any, idx: number) => ({
        id: s.id || `${evt.id}-${idx}`,
        roleName: s.role_name,
        startTime: s.start_time?.slice(11, 16) ?? "",
        endTime: s.end_time?.slice(11, 16) ?? "",
        capacity: s.capacity ?? 0,
      })),
      capacity: evt.capacity ?? 0,
      filled: evt.filled ?? 0,
    }));
    setEvents(mapped);
  };

  useEffect(() => {
    loadEvents();
  }, []);

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

  const combineDateAndTime = (date: string, time: string) => {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    const local = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0);
    return local.toISOString();
  };

  const persistEvent = async (payload: any, existingId?: string) => {
    if (existingId) {
      const res = await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existingId, ...payload }),
      });
      if (!res.ok) return;
      return;
    }
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
  };

  const handleSaveEvent = async (evt: any) => {
    const { id, title, dates, startTime, endTime, subShifts } = evt;
    const buildPayload = (dateStr: string) => ({
      title,
      start_time: combineDateAndTime(dateStr, startTime),
      end_time: combineDateAndTime(dateStr, endTime),
      sub_shifts: subShifts.map((s: any) => ({
        role_name: s.roleName,
        start_time: combineDateAndTime(dateStr, s.startTime),
        end_time: combineDateAndTime(dateStr, s.endTime),
        capacity: s.capacity,
      })),
    });

    if (id) {
      const dateStr = dates[0];
      await persistEvent(buildPayload(dateStr), id);
    } else {
      for (const dateStr of dates) {
        await persistEvent(buildPayload(dateStr));
      }
    }

    await loadEvents();
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    await loadEvents();
    setIsModalOpen(false);
    setEditingEvent(null);
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
          setIsModalOpen(false);
          setEditingEvent(null);
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
        timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      />
    </div>
  );
}
