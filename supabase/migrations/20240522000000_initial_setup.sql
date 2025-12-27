-- Enable pgcrypto early so functions like gen_random_uuid/gen_random_bytes exist
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text check (role in ('admin', 'super_admin', 'volunteer')) default 'volunteer',
  phone_number text,
  calendar_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create index for calendar token lookups
create index idx_profiles_calendar_token on profiles(calendar_token);

-- Create events table
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table events enable row level security;

-- Create sub_shifts table
create table sub_shifts (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  role_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int not null default 1,
  min_needed int default 0,
  created_at timestamptz default now()
);

alter table sub_shifts enable row level security;

-- Create shift_assignments table
create table shift_assignments (
  id uuid default gen_random_uuid() primary key,
  sub_shift_id uuid references sub_shifts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  status text check (status in ('confirmed', 'pending_swap', 'completed', 'no_show')) default 'confirmed',
  checked_in_at timestamptz,
  created_at timestamptz default now(),
  unique(sub_shift_id, user_id)
);

alter table shift_assignments enable row level security;

-- Create swap_requests table
create table swap_requests (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references shift_assignments(id) on delete cascade not null,
  requester_id uuid references profiles(id) on delete cascade not null,
  status text check (status in ('open', 'accepted', 'cancelled')) default 'open',
  accepted_by_id uuid references profiles(id),
  share_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table swap_requests enable row level security;

-- Create index for swap token lookups
create index idx_swap_requests_share_token on swap_requests(share_token);

-- Create audit_logs table
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  performed_by uuid references profiles(id),
  target_resource text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

alter table audit_logs enable row level security;

-- Create organization settings table
create table organization_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)
);

alter table organization_settings enable row level security;

-- Admins can read and update settings
create policy "Admins can read settings" on organization_settings
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can insert settings" on organization_settings
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update settings" on organization_settings
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- Create user preferences table
create table user_preferences (
  user_id uuid references profiles(id) on delete cascade primary key,
  dark_mode boolean default false,
  email_notifications boolean default true,
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

-- Users can manage their own preferences
create policy "Users can read own preferences" on user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert own preferences" on user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update own preferences" on user_preferences
  for update using (auth.uid() = user_id);
