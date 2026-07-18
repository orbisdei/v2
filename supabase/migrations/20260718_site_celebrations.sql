-- Notable Celebrations: per-site list of (date_label, description) pairs,
-- shown on site detail pages above Links. Mirrors the site_links pattern.

create table if not exists public.site_celebrations (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.sites(id) on delete cascade on update cascade,
  date_label text not null,
  description text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists site_celebrations_site_id_idx on public.site_celebrations(site_id);

alter table public.site_celebrations enable row level security;

create policy "Site celebrations are publicly readable"
  on public.site_celebrations for select
  using (true);

create policy "Admins can manage site celebrations"
  on public.site_celebrations for all
  using (current_user_role() = 'administrator');

-- Contributor pending edits carry celebrations alongside images/links
alter table public.site_edits add column if not exists celebrations jsonb;
