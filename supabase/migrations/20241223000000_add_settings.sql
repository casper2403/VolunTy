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
      and profiles.role = 'admin'
    )
  );

create policy "Admins can insert settings" on organization_settings
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can update settings" on organization_settings
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Insert default settings
insert into organization_settings (key, value) values
  ('timezone', 'Europe/Brussels'),
  ('dark_mode', 'false'),
  ('organization_name', 'VolunTy'),
  ('allow_self_signup', 'true');

-- Create user preferences table (for individual user settings like dark mode preference)
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
