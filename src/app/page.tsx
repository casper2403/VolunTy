import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            VolunTy
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            The modern platform for managing work and volunteer scheduling. 
            Organize events, manage shifts, and empower your community.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-lg mx-auto mt-10">
          {/* Admin Card */}
          <Link
            href="/admin"
            className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
          >
            <div className="mb-4 rounded-full bg-blue-100 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Admin Dashboard
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage events, create shifts, and oversee the schedule.
            </p>
          </Link>

          {/* Volunteer Card */}
          <Link
            href="/volunteer"
            className="group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
          >
            <div className="mb-4 rounded-full bg-green-100 p-3 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Volunteer Portal
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Find opportunities, sign up for shifts, and manage your schedule.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
