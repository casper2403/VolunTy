"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Home() {
  const { user, role, isLoading } = useAuth();

  return (
    <main className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-white">
      {/* Hero */}
      <section className="flex-1 px-6 py-12 flex items-center justify-center">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">VolunTy</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Organize events, manage shifts, and empower your community — a modern platform for volunteer coordination.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isLoading && (
              user ? (
                role === "admin" ? (
                  <>
                    <Link
                      href="/admin"
                      className="rounded-md bg-slate-900 dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-slate-600"
                    >
                      Admin Dashboard
                    </Link>
                    <Link
                      href="/volunteer"
                      className="rounded-md border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Volunteer Portal
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/volunteer"
                    className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Volunteer Portal
                  </Link>
                )
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/volunteer"
                    className="text-sm font-semibold leading-6 text-slate-900"
                  >
                    Browse Opportunities
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-slate-200 flex-shrink-0">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="text-slate-500">© {new Date().getFullYear()} VolunTy</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-slate-600 hover:text-slate-900">Privacy Policy</Link>
            <Link href="/terms" className="text-slate-600 hover:text-slate-900">Terms of Service</Link>
            <Link href="/data-deletion" className="text-slate-600 hover:text-slate-900">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
