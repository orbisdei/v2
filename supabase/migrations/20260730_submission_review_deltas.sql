-- One row per field an admin changed between what a pending_submissions
-- payload originally proposed and what actually got approved. Primary use:
-- aggregate by field to see which fields the Discovery research pipeline
-- gets wrong most often, to refine its prompt over time. Not scoped to
-- research-originated submissions specifically -- join back to
-- pending_submissions.submitted_by to isolate those when querying.

create table public.submission_review_deltas (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.pending_submissions(id) on delete cascade,
  field text not null,
  proposed_value text,
  submitted_value text,
  created_at timestamptz not null default now()
);

create index submission_review_deltas_submission_id_idx on public.submission_review_deltas (submission_id);
create index submission_review_deltas_field_idx on public.submission_review_deltas (field);

alter table public.submission_review_deltas enable row level security;

-- Reuses the same current_user_role() helper other admin-only policies in
-- this schema already rely on.
create policy "Admins can view review deltas"
  on public.submission_review_deltas for select
  using (current_user_role() = 'administrator');

create policy "Admins can insert review deltas"
  on public.submission_review_deltas for insert
  with check (current_user_role() = 'administrator');
