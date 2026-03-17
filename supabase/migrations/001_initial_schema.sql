-- ============================================================
-- Orbis Dei — Initial Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

-- ---- Profiles (extends auth.users) ----

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text not null default 'general'
                check (role in ('general', 'contributor', 'administrator')),
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up via Google OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---- Tags ----

create table if not exists public.tags (
  id          text primary key,
  name        text not null,
  description text not null default '',
  image_url   text,
  featured    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---- Sites ----

create table if not exists public.sites (
  id               text primary key,
  name             text not null,
  short_description text not null default '',
  latitude         float8 not null,
  longitude        float8 not null,
  google_maps_url  text not null default '',
  featured         boolean not null default false,
  interest         text,
  contributor      text,           -- legacy free-text for seeded data
  updated_at       timestamptz not null default now(),
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ---- Site Images ----

create table if not exists public.site_images (
  id           uuid primary key default gen_random_uuid(),
  site_id      text not null references public.sites(id) on delete cascade,
  url          text not null,
  caption      text,
  storage_type text not null default 'external'
                check (storage_type in ('local', 'external')),
  display_order int not null default 0
);

-- ---- Site Links ----

create table if not exists public.site_links (
  id        uuid primary key default gen_random_uuid(),
  site_id   text not null references public.sites(id) on delete cascade,
  url       text not null,
  link_type text not null,
  comment   text
);

-- ---- Site ↔ Tag Assignments ----

create table if not exists public.site_tag_assignments (
  site_id text not null references public.sites(id) on delete cascade,
  tag_id  text not null references public.tags(id) on delete cascade,
  primary key (site_id, tag_id)
);

-- ---- Contributor Notes ----

create table if not exists public.site_contributor_notes (
  id         uuid primary key default gen_random_uuid(),
  site_id    text not null references public.sites(id) on delete cascade,
  note       text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- Pending Submissions ----

create table if not exists public.pending_submissions (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('site', 'tag', 'note')),
  action       text not null check (action in ('create', 'edit')),
  payload      jsonb not null,
  site_id      text references public.sites(id) on delete set null,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  review_notes text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles              enable row level security;
alter table public.tags                  enable row level security;
alter table public.sites                 enable row level security;
alter table public.site_images           enable row level security;
alter table public.site_links            enable row level security;
alter table public.site_tag_assignments  enable row level security;
alter table public.site_contributor_notes enable row level security;
alter table public.pending_submissions   enable row level security;

-- Helper: get the calling user's role from profiles
create or replace function public.current_user_role()
returns text
language sql stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---- profiles ----
create policy "Public profiles are viewable"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ---- tags ----
create policy "Tags are publicly readable"
  on public.tags for select using (true);

create policy "Admins can insert tags"
  on public.tags for insert
  with check (public.current_user_role() = 'administrator');

create policy "Admins can update tags"
  on public.tags for update
  using (public.current_user_role() = 'administrator');

-- ---- sites ----
create policy "Sites are publicly readable"
  on public.sites for select using (true);

create policy "Admins can insert sites"
  on public.sites for insert
  with check (public.current_user_role() = 'administrator');

create policy "Admins can update sites"
  on public.sites for update
  using (public.current_user_role() = 'administrator');

-- ---- site_images ----
create policy "Site images are publicly readable"
  on public.site_images for select using (true);

create policy "Admins can manage site images"
  on public.site_images for all
  using (public.current_user_role() = 'administrator');

-- ---- site_links ----
create policy "Site links are publicly readable"
  on public.site_links for select using (true);

create policy "Admins can manage site links"
  on public.site_links for all
  using (public.current_user_role() = 'administrator');

-- ---- site_tag_assignments ----
create policy "Tag assignments are publicly readable"
  on public.site_tag_assignments for select using (true);

create policy "Admins can manage tag assignments"
  on public.site_tag_assignments for all
  using (public.current_user_role() = 'administrator');

-- ---- site_contributor_notes ----
create policy "Contributor notes visible to contributors and admins"
  on public.site_contributor_notes for select
  using (public.current_user_role() in ('contributor', 'administrator'));

create policy "Contributors and admins can insert notes"
  on public.site_contributor_notes for insert
  with check (public.current_user_role() in ('contributor', 'administrator'));

create policy "Admins can manage all notes"
  on public.site_contributor_notes for all
  using (public.current_user_role() = 'administrator');

-- ---- pending_submissions ----
create policy "Contributors can submit"
  on public.pending_submissions for insert
  with check (
    public.current_user_role() in ('contributor', 'administrator')
    and auth.uid() = submitted_by
  );

create policy "Submitters can view own submissions"
  on public.pending_submissions for select
  using (
    auth.uid() = submitted_by
    or public.current_user_role() = 'administrator'
  );

create policy "Admins can update submissions"
  on public.pending_submissions for update
  using (public.current_user_role() = 'administrator');

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_sites_featured on public.sites(featured);
create index if not exists idx_tags_featured on public.tags(featured);
create index if not exists idx_site_tag_assignments_tag on public.site_tag_assignments(tag_id);
create index if not exists idx_site_contributor_notes_site on public.site_contributor_notes(site_id);
create index if not exists idx_pending_submissions_status on public.pending_submissions(status);
create index if not exists idx_pending_submissions_submitted_by on public.pending_submissions(submitted_by);
