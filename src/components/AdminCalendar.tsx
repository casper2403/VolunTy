"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Plus } from "lucide-react";
import CreateEventModal from "./CreateEventModal";
import {
  combineDateAndTimeInTimezone,
  formatTimeInTimezone,
} from "@/lib/timezone";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEvent = {
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
  resource: { filled: number; capacity: number; isCritical: boolean };
};

export default function AdminCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [timezone, setTimezone] = useState<string>("Europe/Brussels");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load timezone setting
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.timezone) {
          setTimezone(data.timezone);
        }
      })
      .catch(() => {});
  }, []);

  const combineDateAndTime = (date: string, time: string) =>
    combineDateAndTimeInTimezone(date, time, timezone);

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
        .map((s: any, idx: number) => {
          // Parse times directly from ISO strings (HH:MM format)
          const startISO = s.start_time || evt.start_time;
          const endISO = s.end_time || evt.end_time;
          return {
            id: s.id || `${evt.id}-${idx}`,
            roleName: s.role_name,
            startDate: startISO?.slice(0, 10) ?? "",
            startTime: startISO ? startISO.slice(11, 16) : "00:00",
            endDate: endISO?.slice(0, 10) ?? "",
            endTime: endISO ? endISO.slice(11, 16) : "00:00",
            capacity: s.capacity ?? 0,
          };
        }),
      resource: {
        filled: evt.filled ?? 0,
        capacity: evt.capacity ?? 0,
        isCritical: false,
      },
    }));
    setEvents(mapped);
  };

  useEffect(() => {
    loadEvents();
  }, [timezone]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setEditingEvent(null);
    // Fix: Use the date directly without timezone conversion that causes off-by-one
    // The calendar gives us a Date object in local time, use it as-is
    const adjustedDate = new Date(start);
    adjustedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    setSelectedDate(adjustedDate);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    setIsSaving(true);
    try {
      const { id, title, startDate, endDate, startTime, endTime, subShifts } = eventData;
      
      if (editingEvent || id) {
        // For editing, update the single event
        const res = await fetch("/api/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEvent?.id ?? id,
            title,
            start_time: `${startDate}T${startTime}:00.000Z`,
            end_time: `${endDate}T${endTime}:00.000Z`,
            sub_shifts: subShifts.map((s: any) => ({
              role_name: s.roleName,
              start_time: `${s.startDate}T${s.startTime}:00.000Z`,
              end_time: `${s.endDate}T${s.endTime}:00.000Z`,
              capacity: s.capacity,
            })),
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update event");
        }
      } else {
        // For creating, generate all dates between start and end
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

        for (const dateStr of dates) {
          const res = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            }),
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to create event");
          }
        }
      }

      await loadEvents();
      setEditingEvent(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert(`Failed to save event: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete event");
      }
      await loadEvents();
      setEditingEvent(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert(`Failed to delete event: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectEvent = (event: any) => {
    setEditingEvent(event as CalendarEvent);
    setSelectedDate(new Date(event.start));
    setIsModalOpen(true);
  };

  const eventStyleGetter = (event: any) => {
    const isCritical = event.resource?.isCritical;
    const style = {
      backgroundColor: isCritical ? "#fee2e2" : "#dbeafe", // red-100 or blue-100
      color: isCritical ? "#991b1b" : "#1e40af", // red-800 or blue-800
      border: isCritical ? "2px solid #ef4444" : "1px solid #93c5fd",
      borderRadius: "6px",
      display: "block",
    };
    return { style };
  };

  return (
    <div className="h-[600px] bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Event Schedule</h2>
        <button
          className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
          onClick={() => {
            setSelectedDate(new Date());
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        view={view}
        onView={setView}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={{
          event: ({ event }: any) => (
            <div className="p-1">
              <div className="font-semibold text-xs">{event.title}</div>
              <div className="text-[10px] mt-1">
                {event.resource.filled}/{event.resource.capacity} Staff
              </div>
            </div>
          ),
        }}
      />

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
        initialEvent={editingEvent ?? undefined}
        timezone={timezone}
        isSaving={isSaving}
      />
    </div>
  );
}
