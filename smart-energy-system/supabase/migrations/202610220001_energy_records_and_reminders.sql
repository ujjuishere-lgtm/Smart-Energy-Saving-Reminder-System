-- Optional cloud schema for authenticated users. Apply only in a project you control.
-- The client must authenticate users before writing household data. Keep RLS enabled.
create table if not exists public.energy_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  consumption_kwh numeric(12, 3) not null check (consumption_kwh > 0 and consumption_kwh <= 100000),
  category text not null check (category in ('Lighting','Cooling','Appliances','Standby power','Laundry','Other')),
  note text not null default '' check (char_length(note) <= 240),
  source text not null default 'user' check (source in ('user','demo')),
  created_at timestamptz not null default now()
);

create index if not exists energy_records_user_date_idx on public.energy_records (user_id, reading_date desc);
alter table public.energy_records enable row level security;
grant select, insert, update, delete on public.energy_records to authenticated;
create policy "Users can read their own energy records" on public.energy_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own energy records" on public.energy_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own energy records" on public.energy_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own energy records" on public.energy_records for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.energy_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  category text not null check (category in ('Lighting','Cooling','Appliances','Standby power','Laundry','Other')),
  due_at timestamptz not null,
  recurrence text not null default 'None' check (recurrence in ('None','Daily','Weekly','Monthly')),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists energy_reminders_user_due_idx on public.energy_reminders (user_id, due_at);
alter table public.energy_reminders enable row level security;
grant select, insert, update, delete on public.energy_reminders to authenticated;
create policy "Users can read their own reminders" on public.energy_reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own reminders" on public.energy_reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own reminders" on public.energy_reminders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own reminders" on public.energy_reminders for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.energy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_baseline_kwh numeric(12,3) not null default 420 check (goal_baseline_kwh > 0),
  goal_reduction_percent numeric(5,2) not null default 10 check (goal_reduction_percent between 0 and 100),
  baseline_month text not null default to_char(now(), 'YYYY-MM'),
  rate_per_kwh numeric(12,2) not null default 8.50 check (rate_per_kwh >= 0),
  fixed_charges numeric(12,2) not null default 0 check (fixed_charges >= 0),
  additional_charges numeric(12,2) not null default 0 check (additional_charges >= 0),
  carbon_kg_per_kwh numeric(12,6) not null default 0 check (carbon_kg_per_kwh >= 0),
  carbon_factor_source text not null default '' check (char_length(carbon_factor_source) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.energy_preferences enable row level security;
grant select, insert, update, delete on public.energy_preferences to authenticated;
create policy "Users can read their own energy preferences" on public.energy_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own energy preferences" on public.energy_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own energy preferences" on public.energy_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own energy preferences" on public.energy_preferences for delete to authenticated using ((select auth.uid()) = user_id);
