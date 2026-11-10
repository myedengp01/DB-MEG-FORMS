-- MEG-FORMS dashboard feed · v2026.11.10 (CLC 10 Nov 2026)
-- A claim returned for revision (status draft + revision_required) showed in the claimant's dashboard as a plain "Draft"
-- dated when it was first created, so it sat far down the list and looked like an old unfinished draft.
-- Now: status "Returned for Revision", action "Revise & Resubmit", and dated when it was returned (top of the list).
-- Patch in place (marker-guarded); no data changes.
do $m$ declare src text;
begin
  select pg_get_functiondef('public.meg_forms_v1145_feed()'::regprocedure) into src;
  if position('Returned for Revision' in src) > 0 then return; end if;
  if position('fin.payment_done_at,' in src) = 0 or position($o$when v_status='draft' then 'Draft'$o$ in src) = 0
     or position($o$v_action_label:='Draft to Complete';$o$ in src) = 0 then raise exception 'meg_forms_v1145_feed has changed'; end if;
  src := replace(src, 'fin.payment_done_at,',
    $n$case when v_status='draft' and lower(coalesce(j->>'revision_required','false'))='true' then public.meg_forms_try_timestamptz(j->>'revision_returned_at') end,
        fin.payment_done_at,$n$);
  src := replace(src, $o$when v_status='draft' then 'Draft'$o$,
    $n$when v_status='draft' and lower(coalesce(j->>'revision_required','false'))='true' then 'Returned for Revision'
        when v_status='draft' then 'Draft'$n$);
  src := replace(src, $o$v_action_label:='Draft to Complete';$o$,
    $n$v_action_label:=case when lower(coalesce(j->>'revision_required','false'))='true' then 'Revise & Resubmit' else 'Draft to Complete' end;$n$);
  execute src;
end $m$;
