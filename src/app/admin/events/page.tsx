import AdminLayout from "@/components/AdminLayout";
import AdminSchedule from "@/components/AdminSchedule";

export default function AdminEventsPage() {
  return (
    <AdminLayout>
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Event Management</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Create and manage volunteer events and shifts.
            </p>
          </div>

          <AdminSchedule />
        </div>
      </div>
    </AdminLayout>
  );
}
