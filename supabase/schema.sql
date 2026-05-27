-- ============================================================
-- MPPS Testing Platform — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Teachers ──────────────────────────────────────────────────
create table teachers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null default 'teacher', -- 'teacher' or 'admin'
  year_levels text[] default '{}',      -- e.g. ['3', '4']
  created_at timestamptz default now()
);

-- ── Classes ───────────────────────────────────────────────────
create table classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,           -- e.g. '3A', 'Prep B'
  year_level text not null,     -- 'Prep', '1', '2' … '6'
  teacher_id uuid references teachers(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Tests ─────────────────────────────────────────────────────
create table tests (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text,
  year_level text,
  curriculum_code text,
  questions jsonb not null default '[]',
  created_by uuid references teachers(id) on delete set null,
  created_at timestamptz default now()
);

-- ── Test Assignments (which classes get which test) ───────────
create table test_assignments (
  id uuid primary key default uuid_generate_v4(),
  test_id uuid references tests(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  assigned_by uuid references teachers(id) on delete set null,
  active boolean default true,
  assigned_at timestamptz default now(),
  unique(test_id, class_id)
);

-- ── Submissions ───────────────────────────────────────────────
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  test_id uuid references tests(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_name text not null,
  score numeric,
  total numeric,
  pct integer,
  results jsonb default '[]',
  submitted_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table teachers enable row level security;
alter table classes enable row level security;
alter table tests enable row level security;
alter table test_assignments enable row level security;
alter table submissions enable row level security;

-- Allow all authenticated users to read teachers (for name display)
create policy "Teachers readable by authenticated" on teachers
  for select using (auth.role() = 'authenticated');

-- Allow admins to manage teachers
create policy "Admins manage teachers" on teachers
  for all using (
    auth.uid() in (select id from teachers where role = 'admin')
  );

-- Teachers can read/write their own classes; admins can do everything
create policy "Teachers manage own classes" on classes
  for all using (
    teacher_id = auth.uid() or
    auth.uid() in (select id from teachers where role = 'admin')
  );

-- Teachers can read all classes (for assignment UI)
create policy "All teachers read classes" on classes
  for select using (auth.role() = 'authenticated');

-- Teachers can manage their own tests; admins see all
create policy "Teachers manage own tests" on tests
  for all using (
    created_by = auth.uid() or
    auth.uid() in (select id from teachers where role = 'admin')
  );

-- All authenticated can read tests (for student-facing)
create policy "All read tests" on tests
  for select using (true);

-- Test assignments readable/writable by relevant teacher or admin
create policy "Manage test assignments" on test_assignments
  for all using (
    assigned_by = auth.uid() or
    auth.uid() in (select id from teachers where role = 'admin')
  );

create policy "All read assignments" on test_assignments
  for select using (true);

-- Submissions: anyone can insert (students), teachers read their class
create policy "Anyone can submit" on submissions
  for insert with check (true);

create policy "Teachers read submissions for their classes" on submissions
  for select using (
    class_id in (
      select id from classes where teacher_id = auth.uid()
    ) or
    auth.uid() in (select id from teachers where role = 'admin')
  );

-- ── Seed: initial admin account ───────────────────────────────
-- After creating your admin user in Supabase Auth,
-- run this with their real UUID from Auth > Users:
--
-- insert into teachers (id, email, name, role)
-- values ('PASTE-UUID-HERE', 'admin@mpps.vic.edu.au', 'MPPS Admin', 'admin');
