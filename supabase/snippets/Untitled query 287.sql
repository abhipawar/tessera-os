-- 1. Create a custom Type to strictly lock down our role definitions
create type public.user_role as enum ('admin', 'tenant');

-- 2. Create the public profiles table linked to the secure Auth system
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role user_role default 'tenant'::user_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lock it down with Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 4. Create the policy: Tenants can only see their own profile.
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- 5. The Automation Engine: Automatically create a profile when a user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'tenant');
  return new;
end;
$$ language plpgsql security definer;

-- 6. The Trigger: Listen for new signups
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();