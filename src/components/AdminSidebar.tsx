"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, ArrowLeftRight, Settings, LayoutDashboard } from "lucide-react";

const navItems = [
  {
    name: "Events",
    href: "/admin/events",
    icon: Calendar,
  },
  {
    name: "Volunteers",
    href: "/admin/volunteers",
    icon: Users,
  },
  {
    name: "Swap Requests",
    href: "/admin/swaps",
    icon: ArrowLeftRight,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 min-h-screen">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Management Console</p>
      </div>
      
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-700 text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
