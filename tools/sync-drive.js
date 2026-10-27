#!/usr/bin/env node
/* اكتشاف الملفات الجديدة في مجلد درايف وتجهيزها بصيغة ملفات data/ (يعمل على جهازك، Node 18+).
   الاستعمال:   DRIVE_API_KEY=مفتاحك node tools/sync-drive.js معرّف_المجلد
   يمرّ على المجلد وكل مجلداته الفرعية، ويقارن بما في المكتبة (بالمعرّف)، ويكتب الجديد فقط في:
     tools/new-rows.txt   صفوف جاهزة للصق داخل addBranch(...) في ملف الفرع المناسب (مجمّعة باسم المجلد الفرعي)
     tools/sync-report.json  تفاصيل كاملة
   المجلد يجب أن يكون مشاركاً «لأي شخص لديه الرابط». رمز النوع يُخمَّن من العنوان فراجعه قبل اللصق. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),KEY=process.env.DRIVE_API_KEY||'',API=process.env.DRIVE_API_BASE||'https://www.googleapis.com',FOLDER=process.argv[2];
if(!FOLDER||!KEY){console.log('الاستعمال: DRIVE_API_KEY=مفتاحك node tools/sync-drive.js معرّف_المجلد');process.exit(1)}
let code=fs.readFileSync(path.join(root,'js/config.js'),'utf8')+'\n';
fs.readdirSync(path.join(root,'data')).filter(f=>/^\d/.test(f)).sort().forEach(f=>code+=fs.readFileSync(path.join(root,'data',f),'utf8')+'\n');
const {DATA,PARTS}=vm.runInNewContext(code+';({DATA,PARTS})'),known=new Set(DATA.map(r=>r[0]));Object.values(PARTS).forEach(p=>p.forEach(x=>known.add(x[0])));
const TYPE=[['n',/إنذار|انذار/],['a',/إعلان|اعلان/],['e',/إشكال|اشكال/],['t',/تظلم/],['w',/توكيل/],['m',/محضر/],['c',/عقد|اتفاق|مخالصة|تنازل/],['g',/مذكرة|دفاع|دفوع|دفع /],['d',/دعوى|صحيفة|طعن|استئناف|معارضة|التماس/],['r',/طلب|التماس|مستند/]];
const guess=t=>(TYPE.find(x=>x[1].test(t))||['f'])[0];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){for(let i=0;i<4;i++){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(r.status==429||r.status>=500){await sleep(1500*(i+1));continue}if(!r.ok)throw new Error('HTTP '+r.status+' — تأكد من المفتاح ومن مشاركة المجلد «لأي شخص لديه الرابط»');return r.json()}throw new Error('تعذّر الاتصال')}
const files=[];
async function walk(id,p){let tok='';do{const q=encodeURIComponent(`'${id}' in parents and trashed=false`),j=await get(`${API}/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${KEY}${tok?'&pageToken='+tok:''}`);
 for(const f of j.files||[]){if(f.mimeType=='application/vnd.google-apps.folder')await walk(f.id,p+'/'+f.name);else files.push({id:f.id,name:f.name,mime:f.mimeType,path:p})}tok=j.nextPageToken||''}while(tok)}
function title(f){let n=f.name;const ext=(n.match(/\.([A-Za-z0-9]+)$/)||[])[1];n=n.replace(/\.[A-Za-z0-9]+$/,'').replace(/\s+/g,' ').trim();
 if(f.mime=='application/vnd.google-apps.document')return n+' (مستند جوجل)';
 if(ext&&!/^docx$/i.test(ext))return n+` (ملف .${ext.toLowerCase()} — تحميل فقط)`;return n}
(async()=>{await walk(FOLDER,'');const fresh=files.filter(f=>!known.has(f.id));
 const groups={};fresh.forEach(f=>{const g=f.path||'(المجلد الرئيسي)';(groups[g]=groups[g]||[]).push(f)});
 let txt='';Object.entries(groups).forEach(([g,list])=>{txt+=`/* ${g} — ${list.length} ملف جديد */\n`+list.map(f=>{const t=title(f);return `[${JSON.stringify(f.id)},${JSON.stringify(t)},${JSON.stringify(guess(t))}],`}).join('\n')+'\n\n'});
 fs.writeFileSync(path.join(__dirname,'new-rows.txt'),txt||'لا توجد ملفات جديدة\n');
 fs.writeFileSync(path.join(__dirname,'sync-report.json'),JSON.stringify({date:new Date().toISOString(),scanned:files.length,known:files.length-fresh.length,fresh:fresh.length,missing_from_drive:[...new Set(DATA.map(r=>r[0]))].filter(i=>!files.some(f=>f.id==i)&&!PARTS[i]).length,files:fresh},null,1));
 console.log(`فُحص ${files.length} ملفاً: ${files.length-fresh.length} موجود في المكتبة، ${fresh.length} جديد → tools/new-rows.txt`)})().catch(e=>{console.log('خطأ:',e.message);process.exit(1)});
