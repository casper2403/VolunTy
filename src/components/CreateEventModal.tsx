"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { formatDateInTimezone, formatTimeInTimezone } from "@/lib/timezone";

interface SubShift {
  id: string;
  roleName: string;
  startDate: string;
  startTime: string;
  endDate: string;
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
  isSaving?: boolean;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialEvent,
  timezone,
  isSaving = false,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [subShifts, setSubShifts] = useState<SubShift[]>([]);

  const isEdit = Boolean(initialEvent);

  // Reset form when opening
  useEffect(() => {
    if (!isOpen) return;

    // Editing existing event
    if (initialEvent) {
      setTitle(initialEvent.title);
      // Format the local Date object directly without UTC conversion
      const startYear = initialEvent.start.getFullYear();
      const startMonth = String(initialEvent.start.getMonth() + 1).padStart(2, '0');
      const startDay = String(initialEvent.start.getDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = initialEvent.end.getFullYear();
      const endMonth = String(initialEvent.end.getMonth() + 1).padStart(2, '0');
      const endDay = String(initialEvent.end.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;
      
      const startHour = String(initialEvent.start.getHours()).padStart(2, '0');
      const startMin = String(initialEvent.start.getMinutes()).padStart(2, '0');
      const startTimeStr = `${startHour}:${startMin}`;
      
      const endHour = String(initialEvent.end.getHours()).padStart(2, '0');
      const endMin = String(initialEvent.end.getMinutes()).padStart(2, '0');
      const endTimeStr = `${endHour}:${endMin}`;
      
      setStartDate(startDateStr);
      setEndDate(endDateStr);
      setStartTime(startTimeStr);
      setEndTime(endTimeStr);
      setSubShifts(
        initialEvent.subShifts
          .sort((a, b) => {
            const aStart = `${a.startDate}T${a.startTime}`;
            const bStart = `${b.startDate}T${b.startTime}`;
            const startCompare = aStart.localeCompare(bStart);
            if (startCompare !== 0) return startCompare;
            const aEnd = `${a.endDate}T${a.endTime}`;
            const bEnd = `${b.endDate}T${b.endTime}`;
            return aEnd.localeCompare(bEnd);
          })
          .map((s) => ({
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
    setStartDate(isoDate);
    setEndDate(isoDate);
    setStartTime("09:00");
    setEndTime("17:00");
    setSubShifts([]);
  }, [initialEvent, initialDate, isOpen, timezone]);

  if (!isOpen) return null;

  const handleAddSubShift = () => {
    setSubShifts([
      ...subShifts,
      {
        id: Math.random().toString(36).substr(2, 9),
        roleName: "",
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        capacity: 1,
      },
    ]);
  };

  const handleRemoveSubShift = (id: string) => {
    setSubShifts(subShifts.filter((s) => s.id !== id));
  };

  const updateSubShift = (id: string, field: keyof SubShift, value: any) => {
    setSubShifts(
      subShifts.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      alert("End date must be after or equal to start date");
      return;
    }
    
    // Check if editing and nothing changed - skip API call
    if (isEdit && initialEvent) {
      const startYear = initialEvent.start.getFullYear();
      const startMonth = String(initialEvent.start.getMonth() + 1).padStart(2, '0');
      const startDay = String(initialEvent.start.getDate()).padStart(2, '0');
      const initialStartDate = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = initialEvent.end.getFullYear();
      const endMonth = String(initialEvent.end.getMonth() + 1).padStart(2, '0');
      const endDay = String(initialEvent.end.getDate()).padStart(2, '0');
      const initialEndDate = `${endYear}-${endMonth}-${endDay}`;
      
      const initialStartHour = String(initialEvent.start.getHours()).padStart(2, '0');
      const initialStartMin = String(initialEvent.start.getMinutes()).padStart(2, '0');
      const initialStartTime = `${initialStartHour}:${initialStartMin}`;
      
      const initialEndHour = String(initialEvent.end.getHours()).padStart(2, '0');
      const initialEndMin = String(initialEvent.end.getMinutes()).padStart(2, '0');
      const initialEndTime = `${initialEndHour}:${initialEndMin}`;
      
      // Compare all fields
      const titleChanged = title !== initialEvent.title;
      const startDateChanged = startDate !== initialStartDate;
      const endDateChanged = endDate !== initialEndDate;
      const startTimeChanged = startTime !== initialStartTime;
      const endTimeChanged = endTime !== initialEndTime;
      
      // Compare sub-shifts
      const subShiftsChanged = 
        subShifts.length !== initialEvent.subShifts.length ||
        subShifts.some((s, i) => {
          const initial = initialEvent.subShifts[i];
          return !initial || 
            s.roleName !== initial.roleName ||
            s.startDate !== (initial.startDate || '') ||
            s.startTime !== initial.startTime ||
            s.endDate !== (initial.endDate || '') ||
            s.endTime !== initial.endTime ||
            s.capacity !== initial.capacity;
        });
      
      // If nothing changed, just close without saving
      if (!titleChanged && !startDateChanged && !endDateChanged && !startTimeChanged && !endTimeChanged && !subShiftsChanged) {
        onClose();
        return;
      }
    }
    
    const eventData = {
      id: initialEvent?.id,
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      subShifts,
    };
    await Promise.resolve(onSave(eventData));
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Create New Event</h2>
          {isEdit && (
            <span className="text-sm text-slate-500">Editing</span>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
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
                disabled={isSaving}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="e.g., Summer Festival"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Start Date & Time
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSaving}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isSaving}
                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                End Date & Time
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSaving}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isSaving}
                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                disabled={isSaving}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add Role
              </button>
            </div>

            <div className="space-y-3">
              {subShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
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
                      disabled={isSaving}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={shift.startDate}
                        onChange={(e) =>
                          updateSubShift(shift.id, "startDate", e.target.value)
                        }
                        disabled={isSaving}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) =>
                          updateSubShift(shift.id, "startTime", e.target.value)
                        }
                        disabled={isSaving}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={shift.endDate}
                        onChange={(e) =>
                          updateSubShift(shift.id, "endDate", e.target.value)
                        }
                        disabled={isSaving}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) =>
                          updateSubShift(shift.id, "endTime", e.target.value)
                        }
                        disabled={isSaving}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="w-32">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Capacity
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
                      disabled={isSaving}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSubShift(shift.id)}
                    disabled={isSaving}
                    className="mb-1 rounded-md p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed self-start"
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
              disabled={isSaving}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                isEdit ? "Save Changes" : "Create Event"
              )}
            </button>
            {isEdit && onDelete && initialEvent?.id && (
              <button
                type="button"
                onClick={() => onDelete(initialEvent.id!)}
                disabled={isSaving}
                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
