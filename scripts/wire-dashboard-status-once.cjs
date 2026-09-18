'use strict';
// One-time, SHA-guarded patch. Never overwrite concurrent edits or modify main.
const fs=require('node:fs');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const branch=cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(branch!=='feature/universal-claims-v2026-09-17-1430')throw Error('Refusing to patch outside intended feature branch');
const path='index.html',bytes=fs.readFileSync(path);
const sha=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
if(sha!=='ae0aee02ba031ad34cf72f3303ad278c24f7f575')throw Error(`Dashboard index changed (${sha}); inspect before patching`);
for(const dependency of ['src/universal-claim-status.js','src/universal-dashboard-status-view.js']){
 if(!fs.existsSync(dependency))throw Error(`Missing dependency ${dependency}`);
}
const old=bytes.toString('utf8');
const scripts='<script src="./src/universal-claim-status.js"></script>\n<script src="./src/universal-dashboard-status-view.js"></script>\n';
if(old.includes('src/universal-dashboard-status-view.js'))throw Error('Already wired; refusing double insertion');
const suffix=/(<\/script>\r?\n)(<\/body>\r?\n<\/html>\r?\n?)$/;
if(!suffix.test(old))throw Error('Unexpected Dashboard closing script/body; abort without changes');
const changed=old.replace(suffix,(_match,endScript,endDocument)=>endScript+scripts+endDocument);
if(changed.length!==old.length+scripts.length)throw Error('Unexpected patch length');
fs.writeFileSync(path,changed);
console.log('PASS SHA-guard: only two read-only canonical dashboard script tags added');
