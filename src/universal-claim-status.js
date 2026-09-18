/* MEG Universal Claim Management V1.0 — v2026.09.17-14:30
 * Read-only adapter. Load explicitly after Supabase client initialization.
 * No DOM mutation, polling, automatic payment writes or legacy field changes.
 * The server filters each claim by the signed-in user's permissions.
 */
(function (root) {
  'use strict';
  const FORMS = new Set(['scf', 'otcf', 'mtcf', 'tec', 'tec-v2', 'prfaf']);
  const UVN = 'v2026.09.17-14:30';
  const MAX_BATCH = 100;

  function normalize(code, id, item) {
    if (!item || item.form_code !== code || String(item.submission_id) !== id) return null;
    return Object.freeze({
      formCode: code,
      submissionId: id,
      workflowStatus: item.workflow_status,
      displayStatus: item.display_status,
      paymentStatus: item.payment_status,
      claimPaid: item.claim_paid === true,
      canMarkPaid: item.can_mark_paid === true,
      eventAt: item.event_at
    });
  }

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
      const match = rows.find(row => row && row.form_code === code && String(row.submission_id) === id);
      return normalize(code, id, match);
    }

    // Accept dashboard rows {form_code, submission_id}; preserve order and original
    // fields, adding canonicalStatus and canonicalStatusAvailable only. A missing row,
    // authorization denial or failed batch is UNKNOWN, never implicitly unpaid.
    // Distinct form codes are queried separately; no RPC exceeds 100 IDs.
    async function reconcile(rows) {
      if (!Array.isArray(rows)) throw new TypeError('Dashboard rows must be an array');
      if (rows.length === 0) return [];
      const groups = new Map();
      for (const row of rows) {
        const code = String(row?.form_code || '').trim().toLowerCase();
        const id = String(row?.submission_id || '').trim();
        if (!FORMS.has(code) || !id) continue;
        if (!groups.has(code)) groups.set(code, new Set());
        groups.get(code).add(id);
      }
      const results = new Map();
      for (const [code, group] of groups) {
        const ids = Array.from(group);
        for (let offset = 0; offset < ids.length; offset += MAX_BATCH) {
          const chunk = ids.slice(offset, offset + MAX_BATCH);
          try {
            const { data, error } = await supabaseClient.rpc('meg_forms_claim_status_batch', {
              p_form_code: code,
              p_submission_ids: chunk
            });
            if (error) throw error;
            for (const item of Array.isArray(data) ? data : []) {
              const id = String(item?.submission_id || '');
              if (!chunk.includes(id)) continue;
              const status = normalize(code, id, item);
              if (status) results.set(code + ':' + id, status);
            }
          } catch (error) {
            // Fail just this chunk closed; other forms/chunks still reconcile.
            for (const id of chunk) results.delete(code + ':' + id);
          }
        }
      }
      return rows.map(row => {
        const code = String(row?.form_code || '').trim().toLowerCase();
        const id = String(row?.submission_id || '').trim();
        const canonicalStatus = results.get(code + ':' + id) || null;
        return Object.freeze({
          ...row,
          canonicalStatus,
          canonicalStatusAvailable: canonicalStatus !== null
        });
      });
    }

    // Call only in response to explicit user actions or when a supported screen opens.
    // Null means not found OR not authorized. Never guess from local payment flags.
    return Object.freeze({ uvn: UVN, read, reconcile });
  }

  root.MEGCreateUniversalClaimStatus = createUniversalClaimStatus;
})(typeof window !== 'undefined' ? window : globalThis);
