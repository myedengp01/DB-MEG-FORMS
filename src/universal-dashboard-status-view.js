/* MEG Universal Claim Management V1.0 — target v2026.09.17-14:30.
 * Read-only Action Center drawer decorator. Existing server-side feed, filters,
 * Finance actions, approval actions and P/AC controls remain unchanged.
 * This is NOT a payment permission migration or a replacement for browser UAT.
 */
(function(root){
 'use strict';
 function install(client){
   if(root.MEGDashboardCanonicalView?.installed) return root.MEGDashboardCanonicalView;
   if(typeof root.MEGCreateUniversalClaimStatus!=='function' || !client || typeof client.rpc!=='function') return null;
   if(typeof root.MEG_renderDrawer!=='function') return null;
   const adapter=root.MEGCreateUniversalClaimStatus(client);
   let generation=0;
   async function refresh(){
     const doc=root.document;
     const list=doc?.getElementById('v1145List');
     const drawer=doc?.getElementById('v1145Drawer');
     if(!list || !drawer?.classList?.contains('open')) return false;
     const rows=root.__MEG_V1145_RENDERED_ROWS__;
     if(!Array.isArray(rows) || !rows.length) return false;
     const items=Array.from(list.querySelectorAll('.v1145-item'));
     if(items.length!==rows.length) return false;
     const token=++generation;
     const snapshots=rows.map((row,i)=>({item:items[i],code:String(row?.form_code||''),id:String(row?.submission_id||'')}));
     // Display unknown while the independent, permission-filtered status query runs.
     for(const {item} of snapshots){
       const pill=item.querySelector('.v1145-pill');
       if(pill){pill.textContent='Checking status…';pill.dataset.canonicalStatusAvailable='false';}
     }
     let result;
     try{result=await adapter.reconcile(rows);}catch(e){
       root.console?.warn?.('Canonical payment-status check unavailable',e);
       result=[];
     }
     if(token!==generation || root.__MEG_V1145_RENDERED_ROWS__!==rows) return false;
     const now=Array.from(list.querySelectorAll('.v1145-item'));
     if(now.length!==snapshots.length || now.some((item,i)=>item!==snapshots[i].item)) return false;
     snapshots.forEach(({item,code,id},i)=>{
       const pill=item.querySelector('.v1145-pill');
       if(!pill)return;
       const entry=result[i];
       const state=entry?.canonicalStatusAvailable && entry.form_code===code && String(entry.submission_id)===id ? entry.canonicalStatus:null;
       pill.textContent=state ? String(state.displayStatus||'Status unavailable'):'Status unavailable';
       pill.dataset.canonicalStatusAvailable=state?'true':'false';
       // Only the visible label is replaced. Actions retain original server authorization.
     });
     return true;
   }
   const oldRender=root.MEG_renderDrawer;
   root.MEG_renderDrawer=function(){const value=oldRender.apply(this,arguments);void refresh();return value;};
   if(typeof root.MEG_STEP2_R4_refreshPaymentButtons==='function'){
     const oldRefresh=root.MEG_STEP2_R4_refreshPaymentButtons;
     root.MEG_STEP2_R4_refreshPaymentButtons=function(){const value=oldRefresh.apply(this,arguments);void refresh();return value;};
   }
   const controller=Object.freeze({installed:true,refresh});
   root.MEGDashboardCanonicalView=controller;
   return controller;
 }
 root.MEGInstallDashboardCanonicalView=install;
 const client=typeof sb!=='undefined'?sb:root.sb;
 install(client);
})(typeof window!=='undefined'?window:globalThis);
