import AdminLayout from "@/components/AdminLayout";
import AdminSwapRequests from "@/components/AdminSwapRequests";

export default function AdminSwapsPage() {
  return (
    <AdminLayout>
      <div className="p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Swap Requests</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Review and manage volunteer shift swap requests.
            </p>
          </div>

          <AdminSwapRequests />
        </div>
      </div>
    </AdminLayout>
  );
}
