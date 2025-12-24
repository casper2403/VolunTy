import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import UserMenu from "@/components/UserMenu";
import Link from "next/link";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VolunTy",
  description: "Volunteer Management Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let role: string | null = null;

  if (session?.user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!error) {
      role = data?.role ?? null;
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider initialSession={session} initialRole={role}>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 w-full">
              <Link href="/" className="text-lg font-bold text-slate-900 hover:text-slate-600 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                VolunTy
              </Link>
              <UserMenu />
            </div>
          </header>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
