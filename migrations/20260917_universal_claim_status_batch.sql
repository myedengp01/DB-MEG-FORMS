-- Universal Claim Management v2026.09.17-14:30
-- Applied to Supabase vzngfswtofegimfcoigx; read-only list-screen status access.
create or replace function public.meg_forms_claim_status_batch(p_form_code text, p_submission_ids text[])
returns table(form_code text, submission_id text, workflow_status text, display_status text, payment_status text, claim_paid boolean, can_mark_paid boolean, event_at timestamptz)
language plpgsql stable security invoker set search_path = ''
as $fn$
begin
  if cardinality(coalesce(p_submission_ids, array[]::text[])) > 100 then
    raise exception 'Maximum 100 claim IDs per status request' using errcode='22023';
  end if;
  return query
    select f.form_code, f.submission_id, f.workflow_status, f.display_status, f.payment_status,
           f.payment_status = 'done', f.can_mark_paid, f.event_at
    from public.meg_forms_v1145_feed() f
    where f.form_code = lower(btrim(p_form_code))
      and f.submission_id = any(coalesce(p_submission_ids, array[]::text[]));
end;
$fn$;
revoke all on function public.meg_forms_claim_status_batch(text,text[]) from public, anon;
grant execute on function public.meg_forms_claim_status_batch(text,text[]) to authenticated;
