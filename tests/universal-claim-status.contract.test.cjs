'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = {};
vm.runInNewContext(fs.readFileSync('src/universal-claim-status.js', 'utf8'), { window: root });
const FORMS = ['scf','otcf','mtcf','tec','tec-v2','prfaf'];
const calls = [];
const client = {rpc: async (name,args) => {
  calls.push({name,args});
  if (name === 'meg_forms_claim_status') {
    return {data:[{form_code:args.p_form_code,submission_id:args.p_submission_id,display_status:'Claim Paid',payment_status:'done',claim_paid:true,can_mark_paid:false}],error:null};
  }
  assert.equal(name,'meg_forms_claim_status_batch');
  if (args.p_form_code === 'tec-v2') return {data:null,error:{message:'temporarily unavailable'}};
  if (args.p_form_code === 'otcf') return {data:[{form_code:'otcf',submission_id:'o1',display_status:'Pending Payment',payment_status:'pending',claim_paid:false,can_mark_paid:true},{form_code:'scf',submission_id:'o2',display_status:'Claim Paid',payment_status:'done',claim_paid:true}],error:null};
  return {data:args.p_submission_ids.map(id=>({form_code:args.p_form_code,submission_id:id,display_status:'Claim Paid',payment_status:'done',claim_paid:true,can_mark_paid:false})),error:null};
}};
(async()=>{
  // Error objects created inside node:vm have distinct prototypes.
  assert.throws(()=>root.MEGCreateUniversalClaimStatus({}),{name:'TypeError',message:/Supabase client/});
  const adapter=root.MEGCreateUniversalClaimStatus(client);
  assert.equal(adapter.uvn,'v2026.09.17-14:30');
  assert.equal((await adapter.read('SCF','s1')).claimPaid,true);
  await assert.rejects(adapter.read('invalid','s1'),{name:'TypeError',message:/Invalid form code/});
  assert.deepEqual(JSON.parse(JSON.stringify(await adapter.reconcile([]))),[]);
  const input=FORMS.map(code=>({form_code:code,submission_id:code+'1',payment_confirmed:false,tag:code}));
  input.push({form_code:'otcf',submission_id:'o1',payment_confirmed:true});
  input.push({form_code:'otcf',submission_id:'o2',payment_confirmed:true});
  input.push({form_code:'scf',submission_id:'scf1',tag:'duplicate'});
  input.push({form_code:'invalid',submission_id:'x',payment_confirmed:true});
  const result=await adapter.reconcile(input);
  assert.equal(result.length,input.length);
  assert.equal(result[0].canonicalStatus.claimPaid,true);
  assert.equal(result[0].payment_confirmed,false,'source must not be modified');
  assert.equal(result.find(r=>r.submission_id==='o1').canonicalStatus.claimPaid,false,'canonical pending defeats stale local paid');
  assert.equal(result.find(r=>r.submission_id==='o2').canonicalStatusAvailable,false,'other-form response is rejected');
  assert.equal(result.find(r=>r.form_code==='tec-v2').canonicalStatusAvailable,false,'RPC error fails closed');
  assert.equal(result.at(-1).canonicalStatusAvailable,false,'invalid form fails closed');
  assert.equal(result.find(r=>r.tag==='duplicate').canonicalStatus.claimPaid,true);
  assert.equal(calls.filter(c=>c.name==='meg_forms_claim_status_batch' && c.args.p_form_code==='scf').length,1,'duplicate IDs deduplicated');
  assert.equal(Object.isFrozen(result[0]),true);
  const before=calls.length;
  const large=Array.from({length:201},(_,i)=>({form_code:'mtcf',submission_id:'m'+i}));
  const big=await adapter.reconcile(large);
  assert.equal(big.length,201);
  assert.equal(big.every(r=>r.canonicalStatusAvailable),true);
  assert.deepEqual(Array.from(calls.slice(before),c=>c.args.p_submission_ids.length),[100,100,1]);
  assert.equal(calls.every(c=>c.name!=='meg_forms_set_payment_done' && c.name!=='meg_forms_admin_delete_claim'),true);
  console.log('PASS dashboard canonical status: six forms, 100-ID chunks, dedup, mixed statuses, fail-closed, read-only');
})().catch(e=>{console.error(e);process.exitCode=1;});
