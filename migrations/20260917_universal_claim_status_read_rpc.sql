-- MEG Universal Claim Management V1.0 (v2026.09.17-14:30)
-- Read-only compatibility API: use the SAME status logic and visibility as Action Center.
-- Do not replace legacy write/payment functions or change existing claim data.
create or replace function public.meg_forms_claim_status(
  p_form_code text,
  p_submission_id text
)
returns table (
  form_code text,
  submission_id text,
  workflow_status text,
  display_status text,
  payment_status text,
  claim_paid boolean,
  can_mark_paid boolean,
  event_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select f.form_code, f.submission_id, f.workflow_status,
         f.display_status, f.payment_status,
         f.payment_status = 'done' as claim_paid,
         f.can_mark_paid, f.event_at
    from public.meg_forms_v1145_feed() f
   where f.form_code = lower(btrim(p_form_code))
     and f.submission_id = p_submission_id
   limit 1;
$fn$;
revoke all on function public.meg_forms_claim_status(text,text) from public, anon;
grant execute on function public.meg_forms_claim_status(text,text) to authenticated;
-- Verification: unauthenticated callers receive no rows; permission/visibility comes from feed.
-- Must test signed-in claimant, approver, P/AC, Finance and Admin before connecting UIs.
