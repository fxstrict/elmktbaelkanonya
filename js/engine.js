/* محرك البحث والتنظيف: تطبيع الحروف، دمج النسخ المكررة، بحث ذكي (ترتيب + مرادفات + أخطاء إملائية).
   ملف مستقل عن الواجهة حتى يمكن اختباره. لإضافة مرادفات: عدّل SYN (الكلمات بعد التطبيع: بدون همزات/تشكيل/تاء مربوطة). */
const nz=t=>t.replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي');
const WS=/[^\u0621-\u064Aa-z0-9]+/i;
const baseTitle=t=>t.replace(/\s*\(نسخة \d+\)\s*$/,'').trim();
const SYN=[
['طلاق','تطليق','خلع','تفريق'],['ايجار','اجار','اجاره','تاجير','مستاجر','مؤجر','موجر','المستاجر'],['طرد','اخلاء','اخلا'],
['ميراث','وراثه','تركه','ورثه','فريضه','وارث'],['نفقه','نفقات','متجمد'],['حضانه','رويه','ضم','حاضنه'],['طاعه','نشوز'],
['انذار','اخطار','تكليف بالوفاء','اعذار'],['توكيل','وكاله','تفويض'],['تعويض','مسئوليه','مسوليه','ضرر','اضرار'],
['دفع','دفوع','دفاع','مذكره دفاع'],['مذكره','مذكرات','صحيفه'],['استئناف','استيناف','مستانف'],['نقض','طعن بالنقض'],
['تزوير','مزور','طعن بالتزوير'],['شيك','شيكات','ايصال امانه','ايصال'],['حجز','حجوزات','توقيع حجز'],['ضريبه','ضرائب','ضريبي'],
['عامل','عمال','فصل تعسفي','عماله'],['جنحه','جنح','جنحي'],['سب','قذف','سب وقذف'],['بيع','مبايعه','بائع','مشتري'],
['شفعه','شفيع'],['حراسه','حارس','حراسة قضائية'],['اشكال','اشكال تنفيذ','وقف تنفيذ'],['عقد','اتفاق','تعاقد'],['زواج','زوجيه','زوج','زوجه']
].map(g=>g.map(nz));
function prep(D){D.forEach(d=>{d.tn=nz(d[1]);d.tw=[...new Set(d.tn.split(WS).filter(Boolean))];d.n=nz(d[1]+' '+d.t+' '+d.b+' '+d.p);d.w=[...new Set(d.n.split(WS).filter(Boolean))]})}
/* دمج النسخ: العنوان نفسه (بعد حذف «(نسخة N)») داخل الفرع نفسه يظهر مرة واحدة، وتبقى النسخ الأخرى في ALT[معرّف الأصل] */
function dedupe(D){const ALT={},seen={};for(let i=0;i<D.length;i++){const d=D[i],k=d[3]+'|'+nz(baseTitle(d[1]));if(seen[k]){(ALT[seen[k][0]]=ALT[seen[k][0]]||[]).push(d);D.splice(i,1);i--}else seen[k]=d}return ALT}
/* هل المسافة بين الكلمتين ≤ m (مع احتساب تبديل حرفين متجاورين) */
function ed(a,b,m){if(Math.abs(a.length-b.length)>m)return false;let p2=null,p1=[...Array(b.length+1).keys()];
 for(let i=1;i<=a.length;i++){const c=[i];let mn=i;for(let j=1;j<=b.length;j++){const k=a[i-1]==b[j-1]?0:1;let v=Math.min(p1[j]+1,c[j-1]+1,p1[j-1]+k);if(p2&&i>1&&j>1&&a[i-1]==b[j-2]&&a[i-2]==b[j-1])v=Math.min(v,p2[j-2]+1);c[j]=v;if(v<mn)mn=v}
  if(mn>m)return false;p2=p1;p1=c}return p1[b.length]<=m}
function parseQ(q){q=nz((q||'').trim());if(!q)return null;
 const ws=q.split(/\s+/).map(w=>w.length>4&&w.startsWith('ال')?w.slice(2):w).filter(Boolean);
 const alts=ws.map(w=>{const s=new Set();SYN.forEach(g=>{if(g.some(m=>w===m||(m.length>=4&&w.length>=4&&(w.startsWith(m)||m.startsWith(w)))))g.forEach(x=>s.add(x))});s.delete(w);return[...s]});
 return{q,ws,alts}}
/* درجة تطابق الصيغة مع الاستعلام؛ 0 = لا تطابق. any=true: يكفي تطابق بعض الكلمات */
function score(d,p,any){let tot=0,hit=0;
 for(let i=0;i<p.ws.length;i++){const w=p.ws[i];let s=0;
  if(d.tw.includes(w))s=3;else if(d.tn.includes(w))s=2.5;else if(d.n.includes(w))s=1.5;
  else if(p.alts[i].some(a=>d.tn.includes(a)))s=2;else if(p.alts[i].some(a=>d.n.includes(a)))s=1;
  else if(w.length>=4){const m=w.length>=7?2:1;if(d.w.some(x=>ed(w,x,m)||(x.length>w.length&&ed(w,x.slice(0,w.length),m))))s=1}
  if(s){tot+=s;hit++}else if(!any)return 0}
 if(!hit)return 0;
 if(p.ws.length>1&&d.tn.includes(p.q))tot+=4;if(d.tn.startsWith(p.q))tot+=3;
 return tot+hit-d.tn.length*0.005}
