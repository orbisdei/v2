-- Event-driven promotion: fire a webhook to the app the moment a new row
-- lands in research_findings, so runResearchFindingsMigration processes it
-- automatically instead of waiting for a manual button click.
--
-- The shared secret is read from Supabase Vault by name at call time, never
-- embedded in this migration — set it once, separately, via:
--   select vault.create_secret('<the actual CRON_SECRET value>', 'research_finding_webhook_secret');
-- Until that secret exists, the trigger no-ops (skips the HTTP call) rather
-- than failing every insert.
--
-- pg_net's net.http_post is fire-and-forget (queued async, not awaited
-- inline in the trigger), so this never slows down or blocks the INSERT
-- itself.

create extension if not exists pg_net;

create or replace function public.notify_research_finding_created()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'research_finding_webhook_secret'
  limit 1;

  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://orbisdei.org/api/admin/research-findings/webhook?secret=' || webhook_secret,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('record', jsonb_build_object('id', new.id))
  );

  return new;
end;
$$;

drop trigger if exists on_research_finding_created on public.research_findings;
create trigger on_research_finding_created
  after insert on public.research_findings
  for each row
  execute function public.notify_research_finding_created();
