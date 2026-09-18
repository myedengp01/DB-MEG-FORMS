'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = {};
vm.runInNewContext(fs.readFileSync('src/universal-claim-payment.js', 'utf8'), {window:root});
const FORMS=['scf','otcf','mtcf','tec','tec-v2','prfaf'];
(async()=>{
 for(const code of FORMS){
  let paid=false; const calls=[];
  const client={rpc:async(name,args)=>{
   calls.push(name);
   if(name==='meg_forms_claim_status')return {data:[{form_code:code,submission_id:'claim-1',claim_paid:paid,payment_status:paid?'done':'pending',can_mark_paid:!paid}],error:null};
   assert.equal(name,'meg_forms_set_payment_done_strict');assert.equal(args.p_done,true);paid=true;return {data:null,error:null};
  }};
  const payment=root.MEGCreateUniversalClaimPayment(client);
  const result=await payment.markPaid(code,'claim-1',{confirm:()=>true});
  assert.equal(result.paid,true);assert.deepEqual(calls,['meg_forms_claim_status','meg_forms_set_payment_done_strict','meg_forms_claim_status']);
  const again=await payment.markPaid(code,'claim-1',{confirm:()=>true});assert.equal(again.alreadyPaid,true);
  assert.equal(calls.filter(x=>x==='meg_forms_set_payment_done_strict').length,1);
 }
 let writes=0;
 const mock=(state,options={})=>({rpc:async(name)=>{
  if(name==='meg_forms_claim_status')return {data:[{form_code:'scf',submission_id:'s1',claim_paid:!!state.paid,payment_status:state.paid?'done':'pending',can_mark_paid:state.allowed!==false}],error:null};
  writes++;if(options.error)return {error:{message:'permission denied'}};state.paid=true;return {error:null};
 }});
 const cancelled=root.MEGCreateUniversalClaimPayment(mock({paid:false}));assert.equal((await cancelled.markPaid('scf','s1',{confirm:()=>false})).cancelled,true);assert.equal(writes,0);
 const blocked=root.MEGCreateUniversalClaimPayment(mock({paid:false,allowed:false}));await assert.rejects(blocked.markPaid('scf','s1',{confirm:()=>true}),/not eligible/);assert.equal(writes,0);
 await assert.rejects(blocked.markPaid('bad','s1',{confirm:()=>true}),/Valid form/);
 const denied=root.MEGCreateUniversalClaimPayment(mock({paid:false},{error:true}));await assert.rejects(denied.markPaid('scf','s1',{confirm:()=>true}),/permission denied/);
 let release;const gate=new Promise(resolve=>{release=resolve;});let count=0;
 const concurrency=root.MEGCreateUniversalClaimPayment({rpc:async(name)=>{if(name==='meg_forms_claim_status'){await gate;return {data:[{form_code:'scf',submission_id:'s1',claim_paid:false,payment_status:'pending',can_mark_paid:true}],error:null};}count++;return {error:null};}});
 const first=concurrency.markPaid('scf','s1',{confirm:()=>false});await assert.rejects(concurrency.markPaid('scf','s1',{confirm:()=>true}),/already in progress/);release();await first;assert.equal(count,0);
 console.log('PASS universal payment client: six forms, confirm, already-paid, denied, cancel, invalid input, concurrent click');
})().catch(e=>{console.error(e);process.exitCode=1;});