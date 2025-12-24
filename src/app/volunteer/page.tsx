"use client";

import VolunteerShiftList from "@/components/VolunteerShiftList";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { useState } from "react";

export default function VolunteerPortal() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"my-shifts" | "open-shifts">("my-shifts");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Login Required</h2>
            <p className="text-slate-600 mb-6">
              Please log in to view volunteer opportunities and manage your shifts.
            </p>
            <Link
              href="/login?redirectTo=/volunteer"
              className="inline-block w-full bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Volunteer Portal</h1>
          <p className="text-slate-500 mt-2">
            Find your next opportunity or manage your existing shifts.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("my-shifts")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "my-shifts"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            My Shifts
          </button>
          <button
            onClick={() => setActiveTab("open-shifts")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "open-shifts"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Open Shifts
          </button>
        </div>

        {/* Tab Content */}
        <VolunteerShiftList activeTab={activeTab} />
      </div>
    </div>
  );
}

