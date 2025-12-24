"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthProviderProps = {
  children: React.ReactNode;
  initialSession?: Session | null;
  initialRole?: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: string | null;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialSession = null,
  initialRole = undefined,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(!initialSession || initialRole === undefined);
  const [role, setRole] = useState<string | null>(initialRole ?? null);
  const supabase = useMemo(() => createClient(), []);

  const loadRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Error loading role:", error.message);
        setRole(null);
        return;
      }
      setRole(data?.role ?? null);
    } catch (e: any) {
      console.error("Exception loading role:", e);
      setRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        let activeSession = session;

        if (!activeSession) {
          const { data: fetchedData } = await supabase.auth.getUser();

          if (!isMounted) return;

          activeSession = fetchedData.user ? { user: fetchedData.user } as Session : null;
          setSession(activeSession);
          setUser(fetchedData.user ?? null);
        }

        if (activeSession?.user && initialRole === undefined) {
          await loadRole(activeSession.user.id);
        }

        if (!activeSession?.user) {
          setRole(null);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error("AuthProvider initialization error:", e);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      console.log("Auth state changed:", _event, { user: nextSession?.user?.id });
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await loadRole(nextSession.user.id);
      } else {
        setRole(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, initialRole]);

  const signInWithGoogle = async (redirectTo?: string) => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) {
      callbackUrl.searchParams.set("next", redirectTo);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
    if (error) {
      console.error("Error signing in with Google:", error.message);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    role,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
