import AdminLayout from "@/components/AdminLayout";

export default function AdminVolunteersPage() {
  return (
    <AdminLayout>
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Volunteer Management</h1>
            <p className="text-slate-500 dark:text-slate-400">
              View and manage volunteer profiles and assignments.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">Volunteer list and management features coming soon...</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
