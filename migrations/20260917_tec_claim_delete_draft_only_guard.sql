-- MEG Universal Claim Management V1.0 / v2026.09.17-14:30
-- Applied to Supabase project vzngfswtofegimfcoigx.
-- The existing broad teacher ALL policies cover DELETE as well as read/write.
-- Keep own-draft deletion, deny direct DELETE for submitted/approved/paid records.
-- Admin deletion of eligible claims remains through audited meg_forms_admin_delete_claim RPC.
create policy "tec direct delete own draft only"
  on public.tec_submissions as restrictive for delete to authenticated
  using (submitted_by = (select auth.uid()) and status = 'draft');
create policy "tec_v2 direct delete own draft only"
  on public.tec_v2_submissions as restrictive for delete to authenticated
  using (submitted_by = (select auth.uid()) and status = 'draft');
-- No existing claim data modified.
-- Check policy existence with pg_policies and test authenticated roles before release.
