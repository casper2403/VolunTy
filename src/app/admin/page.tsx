import AdminCalendar from "@/components/AdminCalendar";

export default function AdminDashboard() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-2">
            Manage events, monitor staffing levels, and handle swap requests.
          </p>
        </div>
        
        <AdminCalendar />
      </div>
    </div>
  );
}

