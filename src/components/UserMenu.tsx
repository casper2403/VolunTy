"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

export default function UserMenu() {
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse"></div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  const userInitial = user.user_metadata?.full_name?.[0] || 
                      user.user_metadata?.name?.[0] || 
                      user.email?.[0]?.toUpperCase() || 
                      "U";

  const userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email || 
                   "User";

  const avatarUrl = user.user_metadata?.avatar_url || 
                    user.user_metadata?.picture;

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
            {userInitial}
          </div>
        )}
        <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate hidden sm:block">
          {userName}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white border border-slate-200 shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-4 py-2 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-900 truncate">
            {userName}
          </p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
