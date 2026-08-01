-- Send the shared secret as a header instead of a URL query param, and give
-- pg_net a timeout that matches the route's own 60s maxDuration.
--
-- Query strings routinely land in CDN/proxy/access logs, and concatenating a
-- raw secret into a URL also silently breaks on characters like + & #, which
-- would need URL-encoding. A header avoids both. The route still accepts
-- ?secret= for backwards compatibility.
--
-- pg_net's default timeout is 5s; a single row's enrichment (Google Places,
-- Nominatim with its ~1.1s pacing, Wikipedia/Wikidata/Commons) regularly runs
-- longer, which recorded every call as a timeout even when the work
-- succeeded server-side.

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
    url := 'https://orbisdei.org/api/admin/research-findings/webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object('record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 60000
  );

  return new;
end;
$$;
