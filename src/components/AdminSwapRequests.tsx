"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function AdminSwapRequests() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/admin/swap-requests");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading swap requests...</div>;
  }

  if (!items.length) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">No pending swap requests.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Swap Requests</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.event_title || "Event"}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">Role: {r.role_name}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Time: {r.start_time?.slice(11, 16)} - {r.end_time?.slice(11, 16)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              Requested by {r.requester_name} ({r.requester_email || "no email"})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
