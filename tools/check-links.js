#!/usr/bin/env node
/* فحص روابط درايف — يعمل على جهازك (Node 18+) لأن المتصفح لا يستطيع فحص درايف.
   الاستعمال:
     DRIVE_API_KEY=مفتاحك node tools/check-links.js          (الأدق — مفتاح Google Drive API مجاني)
     node tools/check-links.js                                  (بدون مفتاح: فحص تقريبي لصفحات المعاينة)
   خيارات: --folders (فحص مجلدات قسم الكتب أيضاً)  --concurrency=6
   المخرجات: data/broken.js (يقرؤه التطبيق ويضع ⚠️) + tools/link-report.json (تفاصيل + اسم الملف الحالي في درايف). */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),arg=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').split('=')[1];
const KEY=process.env.DRIVE_API_KEY||'',API=process.env.DRIVE_API_BASE||'https://www.googleapis.com',WEB=process.env.DRIVE_WEB_BASE||'https://drive.google.com',DOCS=process.env.DRIVE_DOCS_BASE||'https://docs.google.com';
const CONC=+(arg('concurrency')||6),FOLDERS=process.argv.includes('--folders');
let code=fs.readFileSync(path.join(root,'js/config.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'js/library.js'),'utf8')+'\n';
fs.readdirSync(path.join(root,'data')).filter(f=>/^\d/.test(f)).sort().forEach(f=>code+=fs.readFileSync(path.join(root,'data',f),'utf8')+'\n');
const {DATA,LIB,PARTS}=vm.runInNewContext(code+';({DATA,LIB,PARTS})');
const items=DATA.map(r=>({id:r[0],title:r[1],kind:r[2]=='v'?'folder':/مستند جوجل/.test(r[1])?'doc':'file'}));
DATA.filter(r=>r[2]=='v').forEach(r=>(PARTS[r[0]]||[]).forEach(p=>items.push({id:p[0],title:p[1],kind:'file'})));
if(FOLDERS)LIB.forEach(([g,it])=>it.forEach(x=>items.push({id:x[0],title:x[1],kind:'folder'})));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,opt={},tries=4){for(let i=0;i<tries;i++){try{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),...opt});if(r.status==429||r.status>=500){await sleep(1500*(i+1));continue}return r}catch(e){if(i==tries-1)throw e;await sleep(1000*(i+1))}}return {status:429,headers:new Headers(),text:async()=>''}}
async function check(it){
 try{
  if(KEY){const r=await get(`${API}/drive/v3/files/${it.id}?fields=id,name,trashed,mimeType&supportsAllDrives=true&key=${KEY}`);
   if(r.status==200){const j=await r.json();return j.trashed?{st:'trashed',name:j.name}:{st:'ok',name:j.name,mime:j.mimeType}}
   if(r.status==404)return{st:'missing'};if(r.status==403||r.status==401)return{st:'private'};return{st:'unknown',http:r.status}}
  const url=it.kind=='folder'?`${WEB}/drive/folders/${it.id}`:it.kind=='doc'?`${DOCS}/document/d/${it.id}/preview`:`${WEB}/file/d/${it.id}/preview`;
  const r=await get(url);const loc=r.headers.get('location')||'';
  if(r.status==404)return{st:'missing'};if(r.status>=300&&r.status<400)return /accounts\.google|ServiceLogin/.test(loc)?{st:'private'}:{st:'ok'};
  if(r.status==200)return{st:'ok'};return{st:'unknown',http:r.status}
 }catch(e){return{st:'unknown',err:String(e.message||e)}}}
(async()=>{const res=new Array(items.length);let i=0,done=0;
 await Promise.all(Array.from({length:CONC},async()=>{while(i<items.length){const k=i++;res[k]={...items[k],...await check(items[k])};if(++done%50==0)console.log(done+'/'+items.length)}}));
 const cnt={};res.forEach(r=>cnt[r.st]=(cnt[r.st]||0)+1);console.log(cnt,KEY?'(وضع المفتاح)':'(وضع تقريبي)');
 const bad=res.filter(r=>r.id&&['missing','trashed','private'].includes(r.st)&&r.kind!='folder').map(r=>r.id);
 fs.writeFileSync(path.join(root,'data/broken.js'),'/* يُولَّد بأداة tools/check-links.js — معرّفات الملفات التي تعذّر التحقق من رابطها */\nconst BROKEN='+JSON.stringify(bad)+';\n');
 const ren=KEY?res.filter(r=>r.st=='ok'&&r.name&&r.kind!='folder'&&r.name.replace(/\.[^.]+$/,'').trim()!=r.title.replace(/\s*\(.*\)\s*$/,'').trim()).length:0;
 fs.writeFileSync(path.join(__dirname,'link-report.json'),JSON.stringify({date:new Date().toISOString(),counts:cnt,problems:res.filter(r=>r.st!='ok'),renamed_in_drive:KEY?res.filter(r=>r.st=='ok'&&r.name&&r.kind!='folder').map(r=>({id:r.id,title:r.title,drive_name:r.name})).filter(r=>r.drive_name.replace(/\.[^.]+$/,'').trim()!=r.title.trim()).slice(0,500):[]},null,1));
 console.log('data/broken.js ←',bad.length,'رابط معطّل؛ التفاصيل في tools/link-report.json');process.exit(0)})();
