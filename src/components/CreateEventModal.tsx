"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

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
  onSave: (eventData: any) => void;
  initialDate?: Date;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
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

  const updateSubShift = (id: string, field: keyof SubShift, value: any) => {
    setSubShifts(
      subShifts.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Construct the event object
    const eventData = {
      title,
      start: new Date(`${date}T${startTime}`),
      end: new Date(`${date}T${endTime}`),
      subShifts,
    };
    onSave(eventData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Create New Event</h2>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
              {subShifts.map((shift, index) => (
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
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
