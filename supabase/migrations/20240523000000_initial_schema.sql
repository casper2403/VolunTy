-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text check (role in ('admin', 'volunteer')) default 'volunteer',
  phone_number text,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table swap_requests enable row level security;

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

-- Function to handle new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'volunteer');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
