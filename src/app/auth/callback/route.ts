import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Check for OAuth error from provider
  if (error) {
    console.error("OAuth error from provider:", {
      error,
      error_description: errorDescription,
    });
    return NextResponse.redirect(`${origin}/auth/auth-error`);
  }

  if (code) {
    try {
      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        // Verify the session was created
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          return NextResponse.redirect(`${origin}${next}`);
        } else {
          console.error("User not found after session exchange");
        }
      } else {
        console.error("Auth exchange error:", exchangeError.message);
      }
    } catch (e: any) {
      console.error("Auth callback exception:", e.message || e);
    }
  } else {
    console.error("No code provided in callback");
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
