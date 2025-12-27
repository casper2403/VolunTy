-- Function to handle new user creation with error handling
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'volunteer');
  return new;
exception when unique_violation then
  -- Profile already exists, which is fine
  return new;
when others then
  -- Log the error but don't fail the user creation
  raise warning 'Error creating profile for user %: %', new.id, SQLERRM;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Grant necessary permissions for Auth to create profiles
grant usage on schema public to supabase_auth_admin;
grant insert on table public.profiles to supabase_auth_admin;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to generate a unique calendar token using pgcrypto
create or replace function generate_calendar_token()
returns text as $$
declare
  token text;
begin
  loop
    token := encode(extensions.gen_random_bytes(32), 'hex');
    exit when not exists (select 1 from profiles where calendar_token = token);
  end loop;
  return token;
end;
$$ language plpgsql security definer set search_path = public;

-- Create a trigger function to auto-generate tokens for new users
create or replace function set_calendar_token()
returns trigger as $$
declare
  token text;
  attempts int := 0;
begin
  if new.calendar_token is null then
    -- Generate a unique calendar token with retry logic
    loop
      token := encode(extensions.gen_random_bytes(32), 'hex');
      attempts := attempts + 1;
      
      -- Exit if we find a unique token or if we've tried too many times
      if not exists (select 1 from profiles where calendar_token = token) then
        new.calendar_token := token;
        exit;
      elsif attempts > 100 then
        -- Fallback: use a timestamp-based token
        new.calendar_token := 'cal_' || to_char(now(), 'YYYYMMDDHH24MISSUS') || '_' || new.id::text;
        exit;
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Create the trigger
create trigger profiles_set_calendar_token
  before insert on profiles
  for each row execute procedure set_calendar_token();

-- Populate calendar tokens for existing users
update profiles
set calendar_token = generate_calendar_token()
where calendar_token is null;

-- Make calendar_token not null going forward
alter table profiles alter column calendar_token set not null;

-- Insert default settings
insert into organization_settings (key, value) values
  ('timezone', 'Europe/Brussels'),
  ('dark_mode', 'false'),
  ('organization_name', 'VolunTy'),
  ('allow_self_signup', 'true');
