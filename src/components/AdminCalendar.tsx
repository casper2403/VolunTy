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
    startTime: string;
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
        startTime: formatTimeInTimezone(new Date(s.start_time), timezone),
        endTime: formatTimeInTimezone(new Date(s.end_time), timezone),
        capacity: s.capacity ?? 0,
      })),
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
    const { id, title, dates, startTime, endTime, subShifts } = eventData;
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

    if (editingEvent || id) {
      const targetDate = dates[0];
      const res = await fetch("/api/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingEvent?.id ?? id, ...buildPayload(targetDate) }),
      });
      if (!res.ok) return;
    } else {
      for (const dateStr of dates) {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(dateStr)),
        });
        if (!res.ok) return;
      }
    }

    await loadEvents();
    setEditingEvent(null);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    if (!res.ok) return;
    await loadEvents();
    setEditingEvent(null);
    setIsModalOpen(false);
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
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        initialDate={selectedDate}
        initialEvent={editingEvent ?? undefined}
        timezone={timezone}
      />
    </div>
  );
}
