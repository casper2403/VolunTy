"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { formatDateInTimezone, formatTimeInTimezone } from "@/lib/timezone";

interface SubShift {
  id: string;
  roleName: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: any) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  initialDate?: Date;
  initialEvent?: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    subShifts: SubShift[];
  };
  timezone: string;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialEvent,
  timezone,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [subShifts, setSubShifts] = useState<SubShift[]>([
    {
      id: "1",
      roleName: "General Volunteer",
      startTime: "09:00",
      endTime: "17:00",
      capacity: 5,
    },
  ]);

  const isEdit = Boolean(initialEvent);

  // Reset form when opening
  useEffect(() => {
    if (!isOpen) return;

    // Editing existing event
    if (initialEvent) {
      setTitle(initialEvent.title);
      const isoDate = formatDateInTimezone(initialEvent.start, timezone);
      setDates([isoDate]);
      setDateInput(isoDate);
      setStartTime(formatTimeInTimezone(initialEvent.start, timezone));
      setEndTime(formatTimeInTimezone(initialEvent.end, timezone));
      setSubShifts(
        initialEvent.subShifts.map((s) => ({
          ...s,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );
      return;
    }

    // Creating new event
    const isoDate = formatDateInTimezone(initialDate ?? new Date(), timezone);
    setTitle("");
    setDates(isoDate ? [isoDate] : []);
    setDateInput(isoDate);
    setStartTime("09:00");
    setEndTime("17:00");
    setSubShifts([
      {
        id: "1",
        roleName: "General Volunteer",
        startTime: "09:00",
        endTime: "17:00",
        capacity: 5,
      },
    ]);
  }, [initialEvent, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleAddSubShift = () => {
    setSubShifts([
      ...subShifts,
      {
        id: Math.random().toString(36).substr(2, 9),
        roleName: "",
        startTime: startTime,
        endTime: endTime,
        capacity: 1,
      },
    ]);
  };

  const handleRemoveSubShift = (id: string) => {
    setSubShifts(subShifts.filter((s) => s.id !== id));
  };

  const handleAddDate = () => {
    if (!dateInput) return;
    setDates((prev) => Array.from(new Set([...prev, dateInput])));
  };

  const handleRemoveDate = (value: string) => {
    // Prevent removing the only date during edit
    if (isEdit && dates.length === 1) return;
    setDates((prev) => prev.filter((d) => d !== value));
  };

  const updateSubShift = (id: string, field: keyof SubShift, value: any) => {
    setSubShifts(
      subShifts.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedDates = Array.from(new Set(dates.filter(Boolean)));
    if (!normalizedDates.length) return;
    const eventData = {
      id: initialEvent?.id,
      title,
      dates: normalizedDates,
      startTime,
      endTime,
      subShifts,
    };
    await Promise.resolve(onSave(eventData));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Create New Event</h2>
          {isEdit && (
            <span className="text-sm text-slate-500">Editing</span>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 transition-colors"
          >
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Summer Festival"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Dates
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  required
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    if (isEdit) {
                      setDates(e.target.value ? [e.target.value] : []);
                    } else if (!dates.length) {
                      setDates(e.target.value ? [e.target.value] : []);
                    }
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  disabled={!dateInput || isEdit}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isEdit ? "Editing uses a single date" : "Add another date"}
                >
                  <Plus className="h-4 w-4" />
                  Add date
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      className="ml-1 rounded-full p-1 hover:bg-slate-200 disabled:cursor-not-allowed"
                      disabled={isEdit && dates.length === 1}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {!isEdit && (
                <p className="text-xs text-slate-500">
                  Add multiple dates to create repeating events in one go.
                </p>
              )}
              {isEdit && (
                <p className="text-xs text-slate-500">
                  Editing applies to the selected date only.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sub-shifts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Sub-shifts & Roles
              </h3>
              <button
                type="button"
                onClick={handleAddSubShift}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Role
              </button>
            </div>

            <div className="space-y-3">
              {subShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end"
                >
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={shift.roleName}
                      onChange={(e) =>
                        updateSubShift(shift.id, "roleName", e.target.value)
                      }
                      placeholder="e.g., Bar, Security"
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Start
                    </label>
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) =>
                        updateSubShift(shift.id, "startTime", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      End
                    </label>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) =>
                        updateSubShift(shift.id, "endTime", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Cap.
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={shift.capacity}
                      onChange={(e) =>
                        updateSubShift(
                          shift.id,
                          "capacity",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubShift(shift.id)}
                    className="mb-1 rounded-md p-2 text-red-500 hover:bg-red-50"
                    title="Remove Role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {isEdit ? "Save Changes" : "Create Event"}
            </button>
            {isEdit && onDelete && initialEvent?.id && (
              <button
                type="button"
                onClick={() => onDelete(initialEvent.id!)}
                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
