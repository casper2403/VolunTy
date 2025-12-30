"use client";

import VolunteerShiftList from "@/components/VolunteerShiftList";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Calendar, Link as LinkIcon, Copy, X } from "lucide-react";

export default function VolunteerPortal() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"my-shifts" | "open-shifts" | "settings">("my-shifts");
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (user && activeTab === "settings") {
      loadCalendarToken();
    }
  }, [user, activeTab]);

  const loadCalendarToken = async () => {
    try {
      const res = await fetch("/api/volunteer/assignments/token");
      if (res.ok) {
        const data = await res.json();
        setCalendarToken(data.token);
      }
    } catch (error) {
      console.error("Failed to load calendar token:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const calendarUrl = calendarToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/volunteer/calendar?token=${calendarToken}`
    : null;

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
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Login Required</h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Please log in to view volunteer opportunities and manage your shifts.
            </p>
            <Link
              href="/login?redirectTo=/volunteer"
              className="inline-block w-full bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm sm:text-base"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Volunteer Portal</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">
            Find your next opportunity or manage your shifts.
          </p>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="mb-6 sm:mb-8 border-b border-slate-200 overflow-x-auto">
          <div className="flex gap-1 sm:gap-4 min-w-min sm:min-w-0">
            <button
              onClick={() => setActiveTab("my-shifts")}
              className={`px-3 sm:px-4 py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "my-shifts"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              My Shifts
            </button>
            <button
              onClick={() => setActiveTab("open-shifts")}
              className={`px-3 sm:px-4 py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "open-shifts"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Open Shifts
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 sm:px-4 py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "settings"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "settings" ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Push Notifications */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">Notifications</h2>
              <PushNotificationToggle />
            </div>

            {/* Calendar Feed */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">Calendar Integration</h2>
              <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
                      Subscribe to Your Shifts
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mb-4">
                      Add your volunteer shifts to your calendar app (Google Calendar, Apple Calendar,
                      Outlook, etc.). Your calendar will automatically update when shifts change.
                    </p>
                    <button
                      onClick={() => setShowCalendarModal(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center justify-center sm:justify-start gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Get Calendar Feed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <VolunteerShiftList activeTab={activeTab} />
        )}

        {/* Calendar Modal */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
            <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6 sticky top-0 bg-white p-4 sm:p-6 border-b border-slate-200">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Calendar Feed</h2>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-900 mb-2">
                    Calendar Feed URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={calendarUrl || "Loading..."}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-xs sm:text-sm font-mono break-all"
                    />
                    <button
                      onClick={() => calendarUrl && copyToClipboard(calendarUrl)}
                      disabled={!calendarUrl}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {copyFeedback ? <Copy className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copyFeedback ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    This is your personal calendar feed URL. Don't share it with others.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-blue-900 mb-2 sm:mb-3">How to Add to Your Calendar</h3>
                  
                  <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-blue-800">
                    <div>
                      <p className="font-semibold mb-1">📅 Google Calendar:</p>
                      <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2">
                        <li>Open Google Calendar</li>
                        <li>Click the + next to "Other calendars"</li>
                        <li>Select "From URL"</li>
                        <li>Paste the URL above and click "Add calendar"</li>
                      </ol>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">🍎 Apple Calendar:</p>
                      <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2">
                        <li>Open Calendar app</li>
                        <li>Go to File → New Calendar Subscription</li>
                        <li>Paste the URL above</li>
                        <li>Choose update frequency and click Subscribe</li>
                      </ol>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">📧 Outlook:</p>
                      <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2">
                        <li>Open Outlook Calendar</li>
                        <li>Click "Add calendar" → "Subscribe from web"</li>
                        <li>Paste the URL above</li>
                        <li>Name it and click Import</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-amber-800">
                    <strong>Note:</strong> Calendar apps typically update subscribed calendars every few hours. Changes may not appear immediately.
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end p-4 sm:p-6 pt-0 sm:pt-6 sticky bottom-0 bg-white border-t border-slate-200">
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

