"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SwapRequestPage({
  params,
}: {
  params: { token: string };
}) {
  const { user, isLoading: authLoading } = useAuth();
  const [swapRequest, setSwapRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/volunteer/swap-requests/${params.token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Swap request not found");
        }
        const data = await res.json();
        setSwapRequest(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.token]);

  const handleAction = async (action: "accept" | "decline") => {
    if (!user) {
      alert("Please log in to respond to swap requests");
      return;
    }

    if (swapRequest?.requester_name && user.id === swapRequest.requester_id) {
      alert("You cannot accept your own swap request");
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch(`/api/volunteer/swap-requests/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process request");
      }

      setResult(action === "accept" ? "accepted" : "declined");
      setSwapRequest((prev: any) => ({
        ...prev,
        status: action === "accept" ? "accepted" : "cancelled",
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Request Not Found</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Link
              href="/volunteer"
              className="inline-block w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Back to Volunteer Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        {result && (
          <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">
                {result === "accepted"
                  ? "Swap accepted! You've been assigned to this shift."
                  : "Swap request declined."}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <ArrowRightLeft className="h-8 w-8 text-blue-600" />
                Swap Request
              </h1>
              <p className="text-slate-600 mt-1">
                {swapRequest?.requester_name} is looking to swap their shift
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Shift Details */}
            <div className="border-t border-slate-200 pt-6">
              <h2 className="font-semibold text-slate-900 mb-4">Shift Details</h2>
              <div className="space-y-3 text-slate-600">
                <div className="flex justify-between items-start">
                  <span>Event:</span>
                  <span className="font-medium text-slate-900">
                    {swapRequest?.event_title}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span>Role:</span>
                  <span className="font-medium text-slate-900">
                    {swapRequest?.role_name}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span>Date:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(swapRequest?.start_time).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span>Time:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(swapRequest?.start_time).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }
                    )}{" "}
                    -{" "}
                    {new Date(swapRequest?.end_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
                {swapRequest?.event_location && (
                  <div className="flex justify-between items-start">
                    <span>Location:</span>
                    <span className="font-medium text-slate-900">
                      {swapRequest.event_location}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Section */}
            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Please log in to accept or decline this swap request.
                </p>
                <Link
                  href="/login?redirectTo=/volunteer"
                  className="mt-3 inline-block w-full text-center bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Log In
                </Link>
              </div>
            )}

            {user && swapRequest?.status === "open" && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAction("accept")}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Accept Swap"}
                </button>
                <button
                  onClick={() => handleAction("decline")}
                  disabled={processing}
                  className="flex-1 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Decline"}
                </button>
              </div>
            )}

            {user && swapRequest?.status !== "open" && (
              <div className="bg-slate-100 rounded-lg p-4">
                <p className="text-slate-700 font-medium text-center">
                  This swap request is no longer available
                </p>
              </div>
            )}

            {/* Back Button */}
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/volunteer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Volunteer Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
