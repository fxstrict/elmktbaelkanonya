/* L9 (1.31.0): تدقيق ثابت للجودة — node tools/l9-audit.js [--update-budget]
   1) تعارض أسماء المستوى الأعلى بين السكربتات العامة (سبب خطأ proRestore في L8)
   2) تماسك index.html وsw.js والإصدار  3) سلامة الصياغة  4) ميزانية الحجم (tools/l9-budget.json) */
const fs=require('fs'),cp=require('child_process');
let bad=0;const R=(ok,m,x)=>{console.log((ok?'✓ ':'✗ ')+m+(ok||!x?'':'  → '+x));if(!ok)bad++};
const ix=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const ver=JSON.parse(fs.readFileSync('version.json','utf8')).version;
const files=[...ix.matchAll(/<script[^>]*src="([^"?]+)/g)].map(m=>m[1]).filter(f=>/^(js|data)\//.test(f));
// 1) أسماء المستوى الأعلى
const decl={};
for(const f of files){let depth=0;
  for(const L of fs.readFileSync(f,'utf8').split('\n')){
    if(depth===0){const m=L.match(/^(?:async\s+)?(?:function\*?\s+([A-Za-z_$][\w$]*)|(?:var|let|const)\s+([A-Za-z_$][\w$]*))/);
      if(m){const n=m[1]||m[2];(decl[n]=decl[n]||new Set()).add(f)}}
    const c=L.replace(/\/\/.*$/,'').replace(/(["'`])(?:\\.|(?!\1).)*\1/g,'""');
    for(const ch of c){if('{(['.includes(ch)) depth++;else if('})]'.includes(ch)) depth--}
    if(depth<0)depth=0}}
const dup=Object.entries(decl).filter(([,s])=>s.size>1).map(([n,s])=>n+': '+[...s].join(' + '));
R(dup.length===0,'لا تعارض أسماء عامة بين الملفات ('+Object.keys(decl).length+' اسماً في '+files.length+' ملفاً)',dup.join(' | '));
// 2) التماسك
const missing=files.filter(f=>!fs.existsSync(f)),noSw=files.filter(f=>!sw.includes('"'+f+'"'));
R(!missing.length,'كل سكربتات index موجودة',missing.join());
R(!noSw.length,'كل سكربتات index مُدرجة في sw.js',noSw.join());
const stray=fs.readdirSync('js').filter(f=>f.endsWith('.js')&&!files.includes('js/'+f)&&!sw.includes('"js/'+f+'"'));
R(!stray.length,'لا ملف js/ يتيم (غير محمّل ولا مُخزَّن)',stray.join());
const vers=[...ix.matchAll(/\?v=([\d.]+)/g)].map(m=>m[1]);
R(vers.length>0&&vers.every(v=>v===ver)&&sw.includes('siyagh-v'+ver),'الإصدار '+ver+' موحّد في index وsw');
// 3) الصياغة
const syn=[];for(const d of ['js','tools'])for(const f of fs.readdirSync(d))if(f.endsWith('.js')){
  const r=cp.spawnSync('node',['--check',d+'/'+f]);if(r.status)syn.push(d+'/'+f)}
if(cp.spawnSync('node',['--check','sw.js']).status)syn.push('sw.js');
R(!syn.length,'node --check سليم لكل ملفات js/ وtools/ وsw.js',syn.join());
// 4) الميزانية
const size=f=>fs.statSync(f).size;
const cur={totalJs:files.filter(f=>f.startsWith('js/')).reduce((a,f)=>a+size(f),0),scripts:files.length,
  maxFile:Math.max(...files.filter(f=>f.startsWith('js/')).map(size))};
if(process.argv.includes('--update-budget')||!fs.existsSync('tools/l9-budget.json'))
  fs.writeFileSync('tools/l9-budget.json',JSON.stringify({totalJs:Math.round(cur.totalJs*1.10),scripts:cur.scripts+4,maxFile:Math.round(cur.maxFile*1.15)},null,1)+'\n');
const B=JSON.parse(fs.readFileSync('tools/l9-budget.json','utf8'));
for(const k of Object.keys(B))R(cur[k]<=B[k],`ميزانية ${k}: ${cur[k]} ≤ ${B[k]}`);
process.exit(bad?1:0);
