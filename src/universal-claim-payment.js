/* MEG Universal Claim Management — guarded payment client.
 * Deliberately not loaded by index.html until permission and integration tests pass.
 */
(function (root) {
  'use strict';
  const FORMS = new Set(['scf', 'otcf', 'mtcf', 'tec', 'tec-v2', 'prfaf']);
  const pending = new Set();
  function create(client) {
    if (!client || typeof client.rpc !== 'function') throw new Error('Supabase RPC client required');
    async function markPaid(formCode, submissionId, options) {
      const code = String(formCode || '').trim().toLowerCase();
      const id = String(submissionId || '').trim();
      if (!FORMS.has(code) || !id) throw new Error('Valid form code and claim ID required');
      const key = code + ':' + id;
      if (pending.has(key)) throw new Error('Payment confirmation already in progress');
      pending.add(key);
      try {
        const before = await client.rpc('meg_forms_claim_status', {p_form_code: code, p_submission_id: id});
        if (before.error) throw before.error;
        const status = Array.isArray(before.data) ? before.data[0] : before.data;
        if (!status || String(status.submission_id) !== id || String(status.form_code) !== code) throw new Error('Claim status unavailable');
        if (status.claim_paid || status.payment_status === 'done') return {alreadyPaid: true, status};
        if (!status.can_mark_paid) throw new Error('Claim is not eligible for payment confirmation');
        if (typeof options?.confirm !== 'function' || await options.confirm(status) !== true) return {cancelled: true, status};
        const result = await client.rpc('meg_forms_set_payment_done_strict', {p_form_code: code, p_submission_id: id, p_done: true});
        if (result.error) throw result.error;
        const after = await client.rpc('meg_forms_claim_status', {p_form_code: code, p_submission_id: id});
        if (after.error) throw after.error;
        const updated = Array.isArray(after.data) ? after.data[0] : after.data;
        if (!updated || !updated.claim_paid) throw new Error('Payment submitted, but updated status could not be confirmed; refresh before retrying');
        return {paid: true, status: updated};
      } finally {
        pending.delete(key);
      }
    }
    return Object.freeze({markPaid});
  }
  root.MEGCreateUniversalClaimPayment = create;
})(typeof window !== 'undefined' ? window : globalThis);
