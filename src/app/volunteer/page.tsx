import VolunteerShiftList from "@/components/VolunteerShiftList";

export default function VolunteerPortal() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Volunteer Portal</h1>
          <p className="text-slate-500 mt-2">
            Find your next opportunity or manage your existing shifts.
          </p>
        </div>

        <VolunteerShiftList />
      </div>
    </div>
  );
}

