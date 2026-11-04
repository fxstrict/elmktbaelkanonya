/* محرك المواريث (الفرائض) وفق قانون المواريث 77 لسنة 1943 وأرجح أقوال المذهب الحنفي فيما لا نص فيه — للاسترشاد وليس بديلاً عن الإعلام الشرعي.
   كل الحساب بكسور دقيقة (BigInt). ملف مستقل عن الواجهة حتى يمكن اختباره. */
const bg=(a,b)=>{while(b){[a,b]=[b,a%b]}return a<0n?-a:a};
const Fr=(n,d=1n)=>{n=BigInt(n);d=BigInt(d);if(d<0n){n=-n;d=-d}const g=bg(n,d)||1n;return[n/g,d/g]};
const fadd=(a,b)=>Fr(a[0]*b[1]+b[0]*a[1],a[1]*b[1]),fsub=(a,b)=>Fr(a[0]*b[1]-b[0]*a[1],a[1]*b[1]),fmul=(a,b)=>Fr(a[0]*b[0],a[1]*b[1]),fdiv=(a,b)=>Fr(a[0]*b[1],a[1]*b[0]);
const fnum=a=>Number(a[0])/Number(a[1]),fcmp=(a,b)=>{const x=a[0]*b[1],y=b[0]*a[1];return x<y?-1:x>y?1:0},fz=[0n,1n],fo=[1n,1n];
const fstr=a=>a[0]==0n?'0':a[1]==1n?String(a[0]):a[0]+'/'+a[1];
const fmax=(...x)=>x.reduce((m,v)=>fcmp(v,m)>0?v:m);
const MW_KEYS=['husband','wives','father','mother','grandfather','gmM','gmP','sons','daughters','gsons','gdaughters','fullBro','fullSis','patBro','patSis','matBro','matSis','fullNephew','patNephew','fullUncle','patUncle','fullCousin','patCousin'];
const MW_LAB={husband:['الزوج','الزوج'],wives:['الزوجة','الزوجات'],father:['الأب','الأب'],mother:['الأم','الأم'],grandfather:['الجد (أبو الأب)','الجد (أبو الأب)'],gmM:['الجدة لأم (أم الأم)','الجدة لأم (أم الأم)'],gmP:['الجدة لأب (أم الأب)','الجدة لأب (أم الأب)'],sons:['الابن','الأبناء'],daughters:['البنت','البنات'],gsons:['ابن الابن','أبناء الابن'],gdaughters:['بنت الابن','بنات الابن'],fullBro:['الأخ الشقيق','الإخوة الأشقاء'],fullSis:['الأخت الشقيقة','الأخوات الشقيقات'],patBro:['الأخ لأب','الإخوة لأب'],patSis:['الأخت لأب','الأخوات لأب'],matBro:['الأخ لأم','الإخوة لأم'],matSis:['الأخت لأم','الأخوات لأم'],fullNephew:['ابن الأخ الشقيق','أبناء الإخوة الأشقاء'],patNephew:['ابن الأخ لأب','أبناء الإخوة لأب'],fullUncle:['العم الشقيق','الأعمام الأشقاء'],patUncle:['العم لأب','الأعمام لأب'],fullCousin:['ابن العم الشقيق','أبناء الأعمام الأشقاء'],patCousin:['ابن العم لأب','أبناء الأعمام لأب']};
const mwLab=(k,n)=>MW_LAB[k][n>1?1:0];
/* h: عدد كل صنف من الورثة، female: هل المتوفى أنثى. يعيد {rows,notes,out,remainder,base} أو {out:'سبب عدم الدعم'} */
function mwSolve(h,female){
 const n=k=>Math.max(0,parseInt(h[k])||0),ent={},notes=[],cnt={};MW_KEYS.forEach(k=>cnt[k]=n(k));
 if(female)cnt.wives=0;else cnt.husband=0;if(cnt.husband>1)cnt.husband=1;
 const c=k=>cnt[k];if(!MW_KEYS.some(k=>c(k)>0))return{out:'أدخل ورثة المتوفى أولاً.'};
 const set=(k,f,why,t)=>{ent[k]={f,why,t:t||'فرض'}},blk=(k,why)=>{if(c(k))ent[k]={f:fz,why,t:'محجوب'}};
 const sons=c('sons'),dau=c('daughters'),father=c('father'),mother=c('mother'),gf=father?0:c('grandfather');
 if(c('grandfather')&&father)blk('grandfather','محجوب بالأب');
 const maleDesc=sons+c('gsons')>0,hasDesc=sons+dau+c('gsons')+c('gdaughters')>0;
 const gsE=sons?0:c('gsons'),gdE=sons?0:(dau>=2&&!gsE)?0:c('gdaughters');
 if(sons){blk('gsons','محجوب بالابن');blk('gdaughters','محجوبة بالابن')}else if(c('gdaughters')&&!gdE)blk('gdaughters','محجوبة لوجود بنتين فأكثر (استوفتا الثلثين) ولا عاصب معها');
 const femDesc=dau>0||gdE>0,sibAll=c('fullBro')+c('fullSis')+c('patBro')+c('patSis')+c('matBro')+c('matSis');
 /* الإخوة الأشقاء ولأب ولأم */
 const noSib=father>0||maleDesc;
 const fbE=noSib?0:c('fullBro'),fsE=noSib?0:c('fullSis'),fullSisAsb=fsE>0&&fbE==0&&femDesc;
 const pbE=(noSib||fbE>0||fullSisAsb)?0:c('patBro');
 const psBlocked=noSib||fbE>0||fullSisAsb||(c('fullSis')>=2&&pbE==0);
 const psE=psBlocked?0:c('patSis');
 const matOn=!hasDesc&&!father&&!c('grandfather'),mE=matOn?c('matBro')+c('matSis'):0;
 const why0=father?'محجوب بالأب':maleDesc?'محجوب بالابن/ابن الابن':'';
 if(c('fullBro')&&!fbE)blk('fullBro',why0);if(c('fullSis')&&!fsE)blk('fullSis',why0);
 if(c('patBro')&&!pbE)blk('patBro',why0||(c('fullBro')?'محجوب بالأخ الشقيق':'محجوب بالأخت الشقيقة العاصبة مع البنات'));
 if(c('patSis')&&!psE)blk('patSis',why0||(c('fullBro')?'محجوبة بالأخ الشقيق':fullSisAsb?'محجوبة بالأخت الشقيقة العاصبة مع البنات':'محجوبة لاستيفاء الشقيقتين الثلثين'));
 if(!mE){blk('matBro','محجوب بوجود فرع وارث أو أصل ذكر (أب/جد)');blk('matSis','محجوبة بوجود فرع وارث أو أصل ذكر (أب/جد)')}
 /* الزوجية */
 let spouse=fz;
 if(c('husband')){spouse=hasDesc?Fr(1,4):Fr(1,2);set('husband',spouse,hasDesc?'الربع لوجود فرع وارث':'النصف لعدم وجود فرع وارث')}
 if(c('wives')){spouse=hasDesc?Fr(1,8):Fr(1,4);set('wives',spouse,(hasDesc?'الثمن':'الربع')+' لهن جميعاً بالتساوي، '+(hasDesc?'لوجود فرع وارث':'لعدم وجود فرع وارث'))}
 /* الأم */
 if(mother){if(hasDesc||sibAll>=2)set('mother',Fr(1,6),'السدس '+(hasDesc?'لوجود فرع وارث':'لوجود جمع من الإخوة (اثنين فأكثر)'));
  else if(spouse[0]>0n&&father){set('mother',fdiv(fsub(fo,spouse),Fr(3)),'ثلث الباقي بعد فرض الزوج/الزوجة (إحدى العمريتين)');notes.push('طُبّقت إحدى العمريتين: للأم ثلث الباقي بعد فرض أحد الزوجين، وللأب الباقي.')}
  else set('mother',Fr(1,3),'الثلث لعدم وجود فرع وارث أو جمع من الإخوة')}
 /* الجدات */
 const gms=[];if(c('gmM')){if(mother)blk('gmM','محجوبة بالأم');else gms.push('gmM')}if(c('gmP')){if(mother)blk('gmP','محجوبة بالأم');else if(father)blk('gmP','محجوبة بالأب');else gms.push('gmP')}
 if(gms.length){const w=gms.length>1?'السدس للجدتين بالتساوي':'السدس للجدة';set(gms[0],gms.length>1?Fr(1,12):Fr(1,6),w);if(gms[1])set(gms[1],Fr(1,12),w)}
 /* الأب */
 if(father){if(maleDesc)set('father',Fr(1,6),'السدس لوجود فرع وارث مذكر');else if(femDesc||dau>0||c('gdaughters')>0)set('father',Fr(1,6),'السدس فرضاً مع الباقي تعصيباً لوجود فرع وارث مؤنث','فرض وتعصيب');else set('father',fz,'عاصب بالنفس يأخذ الباقي','تعصيب')}
 /* البنات وبنات الابن */
 if(!sons&&dau)set('daughters',dau==1?Fr(1,2):Fr(2,3),dau==1?'النصف للبنت الواحدة':'الثلثان للبنتين فأكثر بالتساوي');
 if(gdE&&!gsE){if(!dau)set('gdaughters',gdE==1?Fr(1,2):Fr(2,3),gdE==1?'النصف لبنت الابن الواحدة':'الثلثان لبنات الابن بالتساوي');else if(dau==1)set('gdaughters',Fr(1,6),'السدس تكملة الثلثين مع البنت الواحدة')}
 /* الإخوة لأم */
 if(mE)set(c('matBro')?'matBro':'matSis',mE==1?Fr(1,6):Fr(1,3),mE==1?'السدس للأخ/الأخت لأم الواحد':'الثلث لأولاد الأم (اثنين فأكثر) يقتسمونه بالتساوي ذكورهم وإناثهم');
 if(mE>1&&c('matBro')&&c('matSis')){const t=Fr(1,3),m=c('matBro'),s=c('matSis');ent.matBro={f:fmul(t,Fr(m,m+s)),why:ent.matBro.why,t:'فرض'};ent.matSis={f:fmul(t,Fr(s,m+s)),why:ent.matBro.why,t:'فرض'}}
 /* الأخوات (فرضاً) */
 if(fsE&&!fbE&&!fullSisAsb)set('fullSis',fsE==1?Fr(1,2):Fr(2,3),fsE==1?'النصف للأخت الشقيقة الواحدة':'الثلثان للشقيقتين فأكثر');
 if(psE&&!pbE&&!(femDesc&&!c('fullSis')))set('patSis',(c('fullSis')==1&&!fullSisAsb)?Fr(1,6):psE==1?Fr(1,2):Fr(2,3),(c('fullSis')==1&&!fullSisAsb)?'السدس تكملة الثلثين مع الأخت الشقيقة الواحدة':psE==1?'النصف للأخت لأب الواحدة':'الثلثان للأخوات لأب');
 /* الجد مع الإخوة (مقاسمة) */
 let special=false;
 if(gf){const sibs=fbE+fsE+pbE+psE;
  if(!maleDesc&&(c('fullBro')+c('fullSis')>0)&&(c('patBro')+c('patSis')>0))return{out:'اجتماع الجد مع إخوة أشقاء وإخوة لأب معاً (المعادّة) — مسألة خاصة تحتاج حساباً يدوياً من مختص.'};
  if(sibs>0){if(hasDesc)return{out:'حالة الجد مع الإخوة مع وجود فرع وارث مؤنث — مسألة خاصة تحتاج حساباً يدوياً من مختص.'};
   let F=fz;['husband','wives','mother','gmM','gmP'].forEach(k=>{if(ent[k]&&ent[k].t=='فرض')F=fadd(F,ent[k].f)});
   const R=fsub(fo,F),sixth=Fr(1,6);
   if(fcmp(R,sixth)<0||(fcmp(F,Fr(5,6))==0))return{out:'استغرقت الفروض التركة مع الجد والإخوة (كالأكدرية) — مسألة خاصة تحتاج حساباً يدوياً من مختص.'};
   const bro=fbE||pbE,sis=fsE||psE,units=bro*2+sis,mq=fmul(R,Fr(2,2+units)),third=fdiv(R,Fr(3)),best=F[0]==0n?fmax(mq,third):fmax(mq,third,sixth);
   const gfShare=best,rest=fsub(R,gfShare),how=fcmp(best,mq)==0?'المقاسمة (يُحسب كأخ)':fcmp(best,third)==0?(F[0]==0n?'ثلث التركة':'ثلث الباقي'):'سدس التركة';
   set('grandfather',gfShare,'الأفضل له: '+how+' (مقاسمة الإخوة)','مقاسمة');special=true;
   const sk=fbE||fsE?['fullBro','fullSis']:['patBro','patSis'];if(bro||sis){const u=bro*2+sis;if(bro)set(sk[0],fmul(rest,Fr(bro*2,u)),'عاصب مع الجد: للذكر مثل حظ الأنثيين','تعصيب');if(sis)set(sk[1],fmul(rest,Fr(sis,u)),bro?'عاصبة بأخيها: للذكر مثل حظ الأنثيين':'عاصبة مع الجد','تعصيب')}
   notes.push('اجتمع الجد مع الإخوة: يرث بالأفضل له من المقاسمة أو ثلث الباقي أو سدس التركة، ويحجب الإخوة لأم.')}
  else set('grandfather',(maleDesc)?Fr(1,6):(femDesc)?Fr(1,6):fz,maleDesc?'السدس لوجود فرع وارث مذكر (يحل محل الأب)':femDesc?'السدس فرضاً مع الباقي تعصيباً (يحل محل الأب)':'عاصب بالنفس يأخذ الباقي (يحل محل الأب)',maleDesc?'فرض':femDesc?'فرض وتعصيب':'تعصيب')}
 /* مجموع الفروض */
 let T=fz;Object.values(ent).forEach(e=>{if(e.t!='محجوب')T=fadd(T,e.f)});
 const res=r=>{const rows=[];MW_KEYS.forEach(k=>{if(!c(k))return;const e=ent[k]||{f:fz,why:'لا يرث (محجوب أو لا نصيب له) في هذه المسألة',t:'محجوب'};rows.push({key:k,count:c(k),label:mwLab(k,c(k)),f:e.f,t:e.t,why:e.why,per:e.f[0]==0n?fz:fdiv(e.f,Fr(c(k)))})});
  let L=1n;rows.forEach(r=>{if(r.f[0]>0n)L=L/bg(L,r.f[1])*r.f[1]});const base=L;return{rows,notes,base,out:null,remainder:r||fz,awl:null,radd:null}};
 let remainder=null,awl=null;
 if(fcmp(T,fo)>0){let L=1n;Object.values(ent).forEach(e=>{if(e.t!='محجوب'&&e.f[0]>0n)L=L/bg(L,e.f[1])*e.f[1]});const sum=Number(T[0]*L/T[1]);awl={from:Number(L),to:sum};
  Object.keys(ent).forEach(k=>{if(ent[k].t!='محجوب')ent[k].f=fdiv(ent[k].f,T)});notes.push(`عالت المسألة من ${awl.from} إلى ${awl.to}: تنقص أنصبة أصحاب الفروض بنسبة واحدة.`)}
 else if(!special){
  const rem=fsub(fo,T),asb=[];
  const grp=(parts,why)=>{const u=parts.reduce((s,p)=>s+p[1]*(c(p[0])),0);return{parts,u,why}};
  const cand=[];
  if(sons)cand.push(grp([['sons',2],['daughters',1]],'عصبة: للذكر مثل حظ الأنثيين'));
  else if(gsE)cand.push(grp([['gsons',2],['gdaughters',gdE?1:0]],'عصبة: للذكر مثل حظ الأنثيين'));
  if(father)cand.push(grp([['father',1]],'الباقي تعصيباً'));
  if(gf&&!special)cand.push(grp([['grandfather',1]],'الباقي تعصيباً'));
  if(fbE)cand.push(grp([['fullBro',2],['fullSis',fsE?1:0]],'عصبة: للذكر مثل حظ الأنثيين'));else if(fullSisAsb)cand.push(grp([['fullSis',1]],'عصبة مع الغير (مع البنات)'));
  if(pbE)cand.push(grp([['patBro',2],['patSis',psE?1:0]],'عصبة: للذكر مثل حظ الأنثيين'));else if(psE&&femDesc&&!c('fullSis')&&!ent.patSis)cand.push(grp([['patSis',1]],'عصبة مع الغير (مع البنات)'));
  [['fullNephew','عصبة (بنو الإخوة الأشقاء)'],['patNephew','عصبة (بنو الإخوة لأب)'],['fullUncle','عصبة (الأعمام الأشقاء)'],['patUncle','عصبة (الأعمام لأب)'],['fullCousin','عصبة (بنو الأعمام الأشقاء)'],['patCousin','عصبة (بنو الأعمام لأب)']].forEach(([k,w])=>{if(c(k))cand.push(grp([[k,1]],w))});
  const win=cand.find(x=>x.u>0);
  if(win&&rem[0]>0n){win.parts.forEach(([k,w])=>{if(!w||!c(k))return;const share=fmul(rem,Fr(w*c(k),win.u));const old=ent[k];if(old&&old.t!='محجوب'&&old.f[0]>0n)ent[k]={f:fadd(old.f,share),why:old.why+' + '+win.why,t:'فرض وتعصيب'};else ent[k]={f:share,why:win.why,t:'تعصيب'}})}
  else if(win){win.parts.forEach(([k])=>{if(c(k)&&!ent[k])ent[k]={f:fz,why:'عاصب لكن لم يبق له شيء بعد الفروض',t:'تعصيب'}})}
  else if(rem[0]>0n){ /* الرد على غير الزوجين */
   const nons=Object.keys(ent).filter(k=>ent[k].t=='فرض'&&!['husband','wives'].includes(k)&&ent[k].f[0]>0n);
   if(nons.length){let S=fz;nons.forEach(k=>S=fadd(S,ent[k].f));const spouseTot=fsub(T,S),pool=fsub(fo,spouseTot);nons.forEach(k=>{ent[k].f=fmul(pool,fdiv(ent[k].f,S));ent[k].why+=' (مع الرد)'});notes.push('لا عاصب: رُدّ الباقي على أصحاب الفروض من غير الزوجين بنسبة فروضهم.')}
   else{remainder=rem;notes.push('بقي من التركة جزء لا عاصب له ولا صاحب فرض نسبي: يؤول لذوي الأرحام ثم الرد على أحد الزوجين ثم بيت المال بحسب الحال، وهذه الحالة خارج نطاق الحاسبة.')}}}
 /* تنبيهات */
 if(c('husband')&&(mother||gms.length)&&mE>=2&&c('fullBro')&&!father&&!hasDesc)notes.push('حالة المشتركة (الحمارية): يسقط الإخوة الأشقاء لاستغراق الفروض وفق المذهب الحنفي المعمول به، بينما يشركهم بعض المذاهب مع أولاد الأم.');
 notes.push('تُحجب الجدات بالأم، وتُحجب الجدة لأب بالأب. ولا يُحسب في الحاسبة فرع ابن الابن الأنزل ولا الحمل ولا المفقود ولا موانع الإرث (القتل واختلاف الدين)، فاستبعد من لا يرث منها قبل الإدخال.');
 const out=res(remainder);out.awl=awl;if(awl){let L=awl.to;out.base=BigInt(awl.to)}out.notes=notes;return out}

/* ---------- الوصية الواجبة (م 76–80 من قانون الوصية 71/1946) ---------- */
/* rowsIn: [{t:'ابن'|'بنت', n, sc, dc, gift}] — ولد توفي قبل أبيه/معه، وعدد أبنائه وبناته (غير الوارثين)، وما أعطاه المتوفى لهم بلا عوض. */
function mwWajiba(h,female,rowsIn,net){const num=x=>{const v=parseFloat(x);return isFinite(v)&&v>0?v:0},I=x=>Math.max(0,parseInt(x)||0);
 const rs=(rowsIn||[]).map(r=>({t:r.t=='بنت'?'بنت':'ابن',n:r.n||'',sc:I(r.sc),dc:I(r.dc),gift:num(r.gift)})).filter(r=>r.sc+r.dc>0);
 if(!rs.length)return{rows:[],total:0,paid:0,scale:1,notes:[],capped:false};
 const notes=[],ss=rs.filter(r=>r.t=='ابن'),sumSc=ss.reduce((a,r)=>a+r.sc,0),sumDc=ss.reduce((a,r)=>a+r.dc,0);let gsHeir=false,gdHeir=false;
 if(sumSc+sumDc>0){const hh={...h,gsons:I(h.gsons)+sumSc,gdaughters:I(h.gdaughters)+sumDc},r0=mwSolve(hh,female);if(r0.out)return{error:'تعذّر تحديد أهلية أولاد الابن للوصية الواجبة: '+r0.out};
  const g=k=>{const x=r0.rows.find(y=>y.key==k);return !!(x&&x.f[0]>0n)};gsHeir=g('gsons');gdHeir=g('gdaughters')}
 const out=[];
 for(const r of rs){const key=r.t=='ابن'?'sons':'daughters',h2={...h};h2[key]=I(h[key])+1;const r2=mwSolve(h2,female);if(r2.out)return{error:'تعذّر حساب نصيب الولد المتوفى لو كان حياً: '+r2.out};
  const row=r2.rows.find(x=>x.key==key),share=row?row.per:fz;let sc=r.sc,dc=r.dc;
  if(r.t=='ابن'){if(gsHeir&&sc>0){notes.push('أبناء الابن المتوفى يرثون ميراثاً (لا يحجبهم ابن حي)، فلا وصية واجبة لهم؛ أدخلهم في خطوة الورثة.');sc=0}if(gdHeir&&dc>0){notes.push('بنات الابن المتوفى يرثن ميراثاً فلا وصية واجبة لهن؛ أدخلهن في خطوة الورثة.');dc=0}}
  const gross=fnum(share)*net,entitle=Math.max(0,gross-r.gift),units=sc*2+dc;
  out.push({n:r.n||'فرع ولد متوفى',t:r.t,sc,dc,share,gross,gift:r.gift,units,amount:units?entitle:0});}
 const total=out.reduce((a,x)=>a+x.amount,0),third=net/3,paid=Math.min(total,third),scale=total>0?paid/total:1;
 out.forEach(x=>{x.paid=x.amount*scale;x.eachSon=x.units?x.paid*2/x.units:0;x.eachDau=x.units?x.paid/x.units:0});
 if(total>third)notes.push('الوصية الواجبة تزيد على الثلث فتقتصر على الثلث وتُوزَّع بين المستحقين بالمحاصة (م 76 و80).');
 return{rows:out,total,paid,scale,capped:total>third,notes}}
/* ---------- التركة والوصية ---------- */
/* o: {h,female,wj,assets:[{q,p}],debts:[{v}],wills:[{n,t,kind,v}],appr:{مفتاح الفئة:true}} */
function mwEstate(res,o){const num=x=>{const v=parseFloat(x);return isFinite(v)&&v>0?v:0};
 const A=(o.assets||[]).reduce((s,a)=>s+num(a.q)*num(a.p),0),D=(o.debts||[]).reduce((s,d)=>s+num(d.v),0),net=A-D;
 if(net<=0)return{A,D,net,error:A<=0?'أدخل قيمة الأصول أولاً.':'الديون ومصروفات التجهيز تستغرق التركة أو تزيد عليها، فلا وصية ولا ميراث.'};
 const wj=(o.wj&&o.wj.length)?mwWajiba(o.h||{},!!o.female,o.wj,net):null;if(wj&&wj.error)return{A,D,net,error:wj.error};
 const wjPaid=wj?wj.paid:0,third=net/3,thirdRem=Math.max(0,third-wjPaid);
 const wills=(o.wills||[]).map(w=>({n:w.n||'موصى له',t:w.t,amt:w.kind=='pct'?net*num(w.v)/100:num(w.v)})).filter(w=>w.amt>0),W=wills.reduce((s,w)=>s+w.amt,0),V1=Math.min(W,thirdRem),E=W-V1;
 const rows=res.rows.map(r=>({...r,s:fnum(r.f)})),appr=o.appr||{};let P=0;if(E>0)rows.forEach(r=>{if(r.s>0&&appr[r.key])P+=E*r.s});
 const paid=V1+P,ratio=W>0?paid/W:0;wills.forEach(w=>{w.got=w.amt*ratio;w.within=W>0?w.amt*V1/W:0});
 const pool=net-wjPaid-V1;rows.forEach(r=>{r.money=r.s*pool-(E>0&&appr[r.key]?E*r.s:0);r.each=r.money/r.count});
 const rem=res.remainder?fnum(res.remainder):0;
 return{A,D,net,third,thirdRem,W,V1,E,P,paid,wills,rows,wj,wjPaid,remMoney:rem*pool,exceed:E>0,unapproved:E-P}}
/* ---------- المناسخات: وفاة وارث قبل قسمة التركة ---------- */
/* res1/est1: نتيجة المسألة الأولى، key: فئة الوارث المتوفى، res2: مسألة ورثته. تعيد حصة كل وارث جديد من التركة الأولى */
function mwMun(res1,est1,key,res2){const r1=res1.rows.find(x=>x.key==key),m1=est1&&!est1.error?est1.rows.find(x=>x.key==key):null;if(!r1)return[];
 return res2.rows.filter(r=>r.f[0]>0n).map(r=>{const fr=fmul(r1.per,r.f);return{key:r.key,label:r.label,count:r.count,fracFirst:fr,fracEach:fdiv(fr,Fr(r.count)),money:m1?m1.each*fnum(r.f):null,each:m1?m1.each*fnum(r.f)/r.count:null,why:r.why}})}
/* ---------- قسمة الأعيان وفروق التسوية ---------- */
/* assign: {index الأصل: معرّف المستلم}; المعرّف: 'h:المفتاح' للوارث، 'w:رقم' للموصى له، 'j:رقم' لفرع الوصية الواجبة */
function mwDivide(est,assets,assign){const num=x=>{const v=parseFloat(x);return isFinite(v)&&v>0?v:0};
 const R=[];est.rows.filter(r=>r.f[0]>0n).forEach(r=>R.push({id:'h:'+r.key,label:r.label+(r.count>1?' (للفئة كلها)':''),due:r.money,got:0}));
 est.wills.forEach((w,i)=>R.push({id:'w:'+i,label:'موصى له: '+w.n,due:w.got,got:0}));
 if(est.wj)est.wj.rows.forEach((x,i)=>R.push({id:'j:'+i,label:'وصية واجبة: '+x.n,due:x.paid,got:0}));
 let un=0;assets.forEach((a,i)=>{const v=num(a.q)*num(a.p);if(!v)return;const t=R.find(x=>x.id==assign[i]);if(t)t.got+=v;else un+=v});
 R.forEach(x=>x.diff=x.got-x.due);const pay=R.filter(x=>x.diff>0.005).reduce((s,x)=>s+x.diff,0),recv=-R.filter(x=>x.diff<-0.005).reduce((s,x)=>s+x.diff,0);
 return{rows:R,unassigned:un,pay,recv,toDebts:pay-recv}}
