# Deployment Guide (External Hosting)

Since you do not want to host this on your personal computer, we will use managed cloud services. This stack (Next.js + Supabase) is designed specifically for this "Serverless" approach.

## 1. The Backend (Supabase)
You do not need to run a database server. Supabase provides a fully managed backend in the cloud.

1.  **Create Account:** Go to [supabase.com](https://supabase.com) and sign up.
2.  **New Project:** Click "New Project". Give it a name (e.g., "VolunTy") and a secure database password.
3.  **Setup Database:**
    *   Go to the **SQL Editor** (icon on the left sidebar).
    *   Click "New Query".
    *   Copy the contents of the file `supabase/migrations/20240523000000_initial_schema.sql` from this repository.
    *   Paste it into the SQL Editor and click **Run**.
    *   *Result:* Your database tables and security policies are now live in the cloud.
4.  **Get Credentials:**
    *   Go to **Project Settings** (gear icon) -> **API**.
    *   Copy the `Project URL` and `anon` / `public` key. You will need these for the frontend.

## 2. The Frontend (Vercel)
Vercel is the standard platform for hosting Next.js applications. It is free for hobby use and handles all the server infrastructure for you.

1.  **Push Code to GitHub:**
    *   Ensure this code is in a GitHub repository.
2.  **Create Vercel Account:** Go to [vercel.com](https://vercel.com) and sign up with GitHub.
3.  **Import Project:**
    *   Click "Add New..." -> "Project".
    *   Select your `VolunTy` repository.
4.  **Configure Environment Variables:**
    *   In the "Environment Variables" section, add the Supabase credentials you copied earlier:
        *   `NEXT_PUBLIC_SUPABASE_URL`: (Your Project URL)
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your anon/public key)
5.  **Deploy:**
    *   Click **Deploy**.
    *   Vercel will build your site and assign it a domain (e.g., `volunty.vercel.app`).

## Summary
*   **Database:** Hosted by Supabase (Cloud).
*   **Website:** Hosted by Vercel (Cloud).
*   **Your Computer:** Only used to write code and push to GitHub. Nothing runs locally for the public site.
