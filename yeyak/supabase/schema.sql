create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null default current_date,
  end_date date,
  teams text[] not null default '{}',
  assignees text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('회의실', '뒤주')),
  date date not null,
  start_hour integer not null check (start_hour between 0 and 23),
  start_minute integer not null check (start_minute between 0 and 59),
  end_hour integer not null check (end_hour between 0 and 23),
  end_minute integer not null check (end_minute between 0 and 59),
  purpose text not null,
  teams text[] not null default '{}',
  project_id uuid references public.projects(id) on delete set null,
  participants text[] not null default '{}',
  attendance jsonb not null default '{}',
  notes text not null default '' check (char_length(notes) <= 250),
  created_at timestamptz not null default now(),
  check ((start_hour * 60 + start_minute) < (end_hour * 60 + end_minute))
);

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default '',
  start_date date not null,
  end_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('note', 'todo')),
  title text not null default '',
  content text not null default '',
  date date,
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_project_status_changed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_status_changed_at on public.projects;
create trigger trg_projects_status_changed_at
before update on public.projects
for each row
execute function public.set_project_status_changed_at();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_notes_updated_at on public.project_notes;
create trigger trg_project_notes_updated_at
before update on public.project_notes
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.reservations enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_notes enable row level security;

drop policy if exists "Public projects access" on public.projects;
create policy "Public projects access"
on public.projects for all
to anon
using (true)
with check (true);

drop policy if exists "Public reservations access" on public.reservations;
create policy "Public reservations access"
on public.reservations for all
to anon
using (true)
with check (true);

drop policy if exists "Public project phases access" on public.project_phases;
create policy "Public project phases access"
on public.project_phases for all
to anon
using (true)
with check (true);

drop policy if exists "Public project notes access" on public.project_notes;
create policy "Public project notes access"
on public.project_notes for all
to anon
using (true)
with check (true);

create index if not exists idx_reservations_date on public.reservations(date);
create index if not exists idx_reservations_project_id on public.reservations(project_id);
create index if not exists idx_project_phases_project_id on public.project_phases(project_id);
create index if not exists idx_project_notes_project_id on public.project_notes(project_id);

insert into public.projects (name, start_date, end_date, teams, assignees, status)
values
  ('수콘분청', '2026-05-01', '2026-06-30', array['FE', 'BE'], array['김재진', '김민성'], 'in_progress'),
  ('포치타', '2026-06-01', '2026-08-31', array['APP'], array['박성헌'], 'planned'),
  ('페이빌더', '2026-04-01', '2026-05-28', array['BE', 'EVE'], array['류주헌', '김윤하'], 'completed')
on conflict (name) do nothing;
