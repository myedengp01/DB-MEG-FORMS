-- MEG Universal Claim Management target UVN v2026.09.17-14:30
-- SCF has an existing 60-day payment-confirmation undo rule in scf_set_payment_status.
-- Central meg_forms_set_payment_done and v1030 also update scf_submissions, but
-- previously bypassed this rule. Enforce it once at the SCF row boundary.
-- Preserves existing authorization and approval checks; changes no existing claim data.
-- Missing confirmation timestamps fail closed on undo of a paid claim.
-- Reconfirming an already paid claim must NOT restart the original 60-day clock.
create or replace function private.meg_forms_guard_scf_payment_undo_window()
returns trigger
language plpgsql
set search_path = ''
as $guard$
begin
  if old.payment_confirmed is true then
    if new.payment_confirmed is distinct from true then
      if old.payment_confirmed_at is null
         or old.payment_confirmed_at < now() - interval '60 days' then
        raise exception 'The 2-month undo window for this payment confirmation has passed'
          using errcode = '23514';
      end if;
    elsif new.payment_confirmed_at is distinct from old.payment_confirmed_at then
      -- Do not allow any central/repeated confirmation to extend the undo window.
      new.payment_confirmed_at := old.payment_confirmed_at;
    end if;
  end if;
  return new;
end;
$guard$;
revoke all on function private.meg_forms_guard_scf_payment_undo_window() from public, anon, authenticated;
drop trigger if exists trg_scf_payment_undo_window_guard on public.scf_submissions;
create trigger trg_scf_payment_undo_window_guard
before update of payment_confirmed, payment_confirmed_at on public.scf_submissions
for each row execute function private.meg_forms_guard_scf_payment_undo_window();
