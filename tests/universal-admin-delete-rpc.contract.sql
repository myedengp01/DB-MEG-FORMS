-- MEG Universal Claim Management v2026.09.17-14:30
-- READ-ONLY inspection contract. Do not execute a deletion against live claims.
-- Run in Supabase SQL editor and inspect all returned rows; expected boolean values are true.
WITH rpc AS (
 SELECT p.oid, pg_get_functiondef(p.oid) AS body, pg_get_function_result(p.oid) AS return_type,
        p.prosecdef AS security_definer
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='meg_forms_admin_delete_claim'
   AND pg_get_function_identity_arguments(p.oid)='p_form_code text, p_submission_id text, p_reason text'
)
SELECT
 count(*)=1 AS exactly_one_rpc,
 bool_and(security_definer) AS security_definer,
 bool_and(return_type='jsonb') AS jsonb_result,
 bool_and(body LIKE '%auth.uid()%') AS requires_authentication,
 bool_and(body LIKE '%fp.is_admin is true%') AS checks_per_form_admin,
 bool_and(body LIKE '%length(btrim(p_reason))<3%') AS requires_reason,
 bool_and(body LIKE '%for update%') AS locks_claim,
 bool_and(body LIKE '%meg_forms_finance_status%') AS checks_finance_status,
 bool_and(body LIKE '%ledger_transactions%') AS checks_ledger,
 bool_and(body LIKE '%private.meg_forms_admin_delete_claim_impl%') AS delegates_to_audited_implementation
FROM rpc;
