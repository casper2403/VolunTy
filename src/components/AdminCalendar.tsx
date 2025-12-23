"use client";

import { useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Plus } from "lucide-react";
import CreateEventModal from "./CreateEventModal";

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

// Mock data for demonstration
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Summer Festival",
    start: new Date(2025, 11, 25, 10, 0), // Dec 25, 2025
    end: new Date(2025, 11, 25, 18, 0),
    resource: {
      filled: 12,
      capacity: 20,
      isCritical: false,
    },
  },
  {
    id: 2,
    title: "Charity Gala Setup",
    start: new Date(2025, 11, 26, 9, 0),
    end: new Date(2025, 11, 26, 14, 0),
    resource: {
      filled: 2,
      capacity: 10,
      isCritical: true, // < 48h and low staff
    },
  },
];

export default function AdminCalendar() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [view, setView] = useState(Views.MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (newEvent: any) => {
    // Calculate total capacity from sub-shifts
    const totalCapacity = newEvent.subShifts.reduce(
      (acc: number, curr: any) => acc + curr.capacity,
      0
    );

    setEvents([
      ...events,
      {
        id: events.length + 1,
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end,
        resource: {
          filled: 0,
          capacity: totalCapacity,
          isCritical: false,
        },
      },
    ]);
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
    <div className="h-[600px] bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Event Schedule</h2>
        <button
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
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
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialDate={selectedDate}
      />
    </div>
  );
}
