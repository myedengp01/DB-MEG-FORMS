'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const item=()=>({pill:{textContent:'Stale local status',dataset:{}},querySelector(selector){return selector==='.v1145-pill'?this.pill:null;}});
const items=[item(),item(),item()];
const drawer={classList:{contains:name=>name==='open'}};
const list={querySelectorAll:selector=>selector==='.v1145-item'?items:[]};
let renderCalls=0,financeCalls=0,openCalls=0,tabCalls=0,reads=0;
const rows=[
 {form_code:'scf',submission_id:'a',display_status:'Pending Payment',payment_status:'pending'},
 {form_code:'otcf',submission_id:'b',display_status:'Claim Paid',payment_status:'done'},
 {form_code:'tec-v2',submission_id:'c',display_status:'Pending Payment',payment_status:'pending'}
];
const root={sb:{rpc:()=>{throw Error('UI itself must not issue mutation RPCs');}},document:{getElementById:id=>id==='v1145List'?list:id==='v1145Drawer'?drawer:null},console,
 __MEG_V1145_RENDERED_ROWS__:rows,
 MEG_renderDrawer:()=>{renderCalls++;return 'rendered';},
 MEG_openActionCenter:()=>{openCalls++;return 'opened';},
 MEG_setTab:()=>{tabCalls++;return 'tabbed';},
 MEG_STEP2_R4_refreshPaymentButtons:()=>{financeCalls++;return 'finance kept';},
 MEGCreateUniversalClaimStatus:()=>({reconcile:async input=>{reads++;return input.map((row,index)=>({...row,canonicalStatus:index===2?null:{displayStatus:index===0?'Claim Paid':'Pending Payment'},canonicalStatusAvailable:index!==2}));}})
};
vm.runInNewContext(fs.readFileSync('src/universal-dashboard-status-view.js','utf8'),{window:root,console});
(async()=>{
 assert.equal(root.MEGDashboardCanonicalView.installed,true);
 assert.equal(root.MEG_renderDrawer(),'rendered');
 assert.equal(root.MEG_openActionCenter(),'opened');
 assert.equal(root.MEG_setTab(),'tabbed');
 assert.equal(root.MEG_STEP2_R4_refreshPaymentButtons(),'finance kept');
 assert.equal(renderCalls,1);assert.equal(openCalls,1);assert.equal(tabCalls,1);assert.equal(financeCalls,1);
 assert.equal(await root.MEGDashboardCanonicalView.refresh(),true);
 assert.equal(items[0].pill.textContent,'Claim Paid','canonical paid replaces stale pending display');
 assert.equal(items[1].pill.textContent,'Pending Payment','canonical pending replaces stale paid display');
 assert.equal(items[2].pill.textContent,'Status unavailable','missing/unauthorized is not unpaid');
 assert.equal(items[2].pill.dataset.canonicalStatusAvailable,'false');
 assert.equal(rows[0].display_status,'Pending Payment','input feed unchanged');
 assert.equal(rows[1].payment_status,'done','finance data unchanged');
 assert.ok(reads>=4,'real exported navigation entry points trigger reconciliation');
 assert.equal(root.MEGInstallDashboardCanonicalView(root.sb),root.MEGDashboardCanonicalView,'installer idempotent');
 console.log('PASS Dashboard: open/tab/render/finance entry points, canonical badges, unknown fail-closed, read-only');
})().catch(error=>{console.error(error);process.exitCode=1;});
