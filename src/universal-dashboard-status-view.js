/* MEG Universal Claim Management — v2026.09.20-09:00.
 * Action Center canonical status and explicit, server-authorized Claim Paid action.
 * Rollback: restore this file at blob f9c95745c2793bf1721661d38016851291c9829c.
 */
(function(root){
 'use strict';
 function install(client){
   if(root.MEGDashboardCanonicalView?.installed)return root.MEGDashboardCanonicalView;
   if(typeof root.MEGCreateUniversalClaimStatus!=='function'||!client||typeof client.rpc!=='function'||typeof root.MEG_renderDrawer!=='function')return null;
   const adapter=root.MEGCreateUniversalClaimStatus(client);
   const pending=new Set();
   let generation=0;
   async function markPaid(code,id,button){
     const key=code+':'+id;
     if(pending.has(key))return;
     if(!root.confirm('Confirm Claim Paid for '+code.toUpperCase()+' claim '+id+'? This records an actual payment confirmation.'))return;
     pending.add(key);button.disabled=true;button.textContent='Processing…';
     try{
       const before=await adapter.read(code,id);
       if(!before)throw new Error('Claim status unavailable. No payment change made.');
       if(before.claimPaid){await refresh();return;}
       if(!before.canMarkPaid)throw new Error('Payment not permitted or claim not approved.');
       const {error}=await client.rpc('meg_forms_set_payment_done_strict',{p_form_code:code,p_submission_id:id,p_done:true});
       if(error)throw error;
       const after=await adapter.read(code,id);
       if(!after?.claimPaid)throw new Error('Payment request sent; status unconfirmed. Refresh before retrying.');
       await refresh();
       root.alert('Claim Paid confirmed.');
     }catch(error){root.alert(error?.message||'Payment confirmation failed.');await refresh();}
     finally{pending.delete(key);button.disabled=false;}
   }
   async function refresh(){
     const doc=root.document;
     const list=doc?.getElementById('v1145List');
     const drawer=doc?.getElementById('v1145Drawer');
     if(!list||!drawer?.classList?.contains('open'))return false;
     const rows=root.__MEG_V1145_RENDERED_ROWS__;
     if(!Array.isArray(rows)||!rows.length)return false;
     const items=Array.from(list.querySelectorAll('.v1145-item'));
     if(items.length!==rows.length)return false;
     const token=++generation;
     const snapshots=rows.map((row,i)=>({item:items[i],code:String(row?.form_code||'').trim().toLowerCase(),id:String(row?.submission_id||'').trim()}));
     for(const {item} of snapshots){const pill=item.querySelector('.v1145-pill');if(pill){pill.textContent='Checking status…';pill.dataset.canonicalStatusAvailable='false';}item.querySelector('.meg-claim-paid-action')?.remove();}
     let result;
     try{result=await adapter.reconcile(rows);}catch(error){root.console?.warn?.('Canonical status unavailable',error);result=[];}
     if(token!==generation||root.__MEG_V1145_RENDERED_ROWS__!==rows)return false;
     const now=Array.from(list.querySelectorAll('.v1145-item'));
     if(now.length!==snapshots.length||now.some((item,i)=>item!==snapshots[i].item))return false;
     snapshots.forEach(({item,code,id},i)=>{
       const pill=item.querySelector('.v1145-pill');
       const entry=result[i];
       const state=entry?.canonicalStatusAvailable&&entry.form_code?.toLowerCase()===code&&String(entry.submission_id)===id?entry.canonicalStatus:null;
       if(pill){pill.textContent=state?String(state.displayStatus||'Status unavailable'):'Status unavailable';pill.dataset.canonicalStatusAvailable=state?'true':'false';}
       if(!state||state.claimPaid||!state.canMarkPaid||pending.has(code+':'+id))return;
       const button=doc.createElement('button');
       button.type='button';button.className='meg-claim-paid-action';button.textContent='Claim Paid';
       button.style.cssText='margin:8px 0;padding:7px 12px;border-radius:8px;border:1px solid #16a34a;background:#14532d;color:white;cursor:pointer;font-weight:600;';
       button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void markPaid(code,id,button);});
       item.appendChild(button);
     });
     return true;
   }
   function wrap(name){if(typeof root[name]!=='function')return;const original=root[name];root[name]=function(){const value=original.apply(this,arguments);void refresh();return value;};}
   ['MEG_renderDrawer','MEG_openActionCenter','MEG_setTab','MEG_STEP2_R4_refreshPaymentButtons'].forEach(wrap);
   const controller=Object.freeze({installed:true,uvn:'v2026.09.20-09:00',refresh});
   root.MEGDashboardCanonicalView=controller;
   return controller;
 }
 root.MEGInstallDashboardCanonicalView=install;
 const client=typeof sb!=='undefined'?sb:root.sb;
 install(client);
})(typeof window!=='undefined'?window:globalThis);
