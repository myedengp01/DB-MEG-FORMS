/* MEG Universal Claim Management V1.0 — v2026.09.17-14:30
 * Read-only adapter. Load explicitly after Supabase client initialization.
 * No DOM mutation, polling, automatic payment writes or legacy field changes.
 */
(function (root) {
  'use strict';
  const FORMS = new Set(['scf', 'otcf', 'mtcf', 'tec', 'tec-v2', 'prfaf']);
  const UVN = 'v2026.09.17-14:30';

  function createUniversalClaimStatus(supabaseClient) {
    if (!supabaseClient || typeof supabaseClient.rpc !== 'function') {
      throw new TypeError('A connected Supabase client is required');
    }

    async function read(formCode, submissionId) {
      const code = String(formCode || '').trim().toLowerCase();
      const id = String(submissionId || '').trim();
      if (!FORMS.has(code) || !id) throw new TypeError('Invalid form code or submission ID');
      const { data, error } = await supabaseClient.rpc('meg_forms_claim_status', {
        p_form_code: code,
        p_submission_id: id
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      const item = rows.find(row => row && row.form_code === code && String(row.submission_id) === id);
      return item ? Object.freeze({
        formCode: code,
        submissionId: id,
        workflowStatus: item.workflow_status,
        displayStatus: item.display_status,
        paymentStatus: item.payment_status,
        claimPaid: item.claim_paid === true,
        canMarkPaid: item.can_mark_paid === true,
        eventAt: item.event_at
      }) : null;
    }

    // Call only in response to explicit user actions or when a supported screen opens.
    // Null means not found OR not authorized. Never guess from local payment flags.
    return Object.freeze({ uvn: UVN, read });
  }

  root.MEGCreateUniversalClaimStatus = createUniversalClaimStatus;
})(typeof window !== 'undefined' ? window : globalThis);
