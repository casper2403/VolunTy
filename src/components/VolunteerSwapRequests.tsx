"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Trash2, AlertCircle, Calendar, Clock } from "lucide-react";

export default function VolunteerSwapRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/volunteer/swap-requests");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load swap requests");
      }
      const data = await res.json();
      setRequests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const cancelRequest = async (id: string) => {
    try {
      const res = await fetch("/api/volunteer/swap-requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setRequests(requests.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Loading swap requests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 dark:text-slate-400">
          You haven't created any swap requests yet.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
          Create one from your shifts to find someone to swap with.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        My Swap Requests
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden"
          >
            {req.status === "open" && (
              <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-bl-lg">
                Open
              </div>
            )}
            {req.status === "accepted" && (
              <div className="absolute top-0 right-0 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs font-bold px-2 py-1 rounded-bl-lg">
                Accepted
              </div>
            )}
            <div className="mb-3">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                {req.event_title}
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-medium">{req.role_name}</p>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{req.start_time?.slice(0, 10)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {req.start_time?.slice(11, 16)} - {req.end_time?.slice(11, 16)}
                </span>
              </div>
            </div>

            {req.status === "open" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded p-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/swap-requests/${req.share_token}`}
                    className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-400 outline-none"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/swap-requests/${req.share_token}`,
                        req.id
                      )
                    }
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    {copied === req.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => cancelRequest(req.id)}
                  className="w-full text-sm px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-300 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel Request
                </button>
              </div>
            )}

            {req.status === "accepted" && (
              <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 p-2 rounded">
                ✓ Swap accepted!
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
