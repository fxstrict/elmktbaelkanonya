#!/usr/bin/env node
/* اختبار N10 (1.19.0): دالّات نقية في Node — تحويل الهجري إلى ميلادي التقريبي، وخطة اعتماد الجلسات والمواعيد في القضية، وأعمدة Excel الجديدة.
   الاستعمال: node tools/n10-test.js [--v] — كود الخروج ≠ 0 عند أي فشل. */
const fs=require('fs'),vm=require('vm'),path=require('path'),V=process.argv.includes('--v');
const J=p=>path.join(__dirname,'..','js',p),ctx=vm.createContext({TextEncoder,TextDecoder,DecompressionStream,Blob,Response,console});
vm.runInContext(fs.readFileSync(J('docx.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(J('extract.js'),'utf8'),ctx);
const EX=vm.runInContext('EX',ctx);
let P=0,F=0;const T=(n,ok,i)=>{ok?P++:F++;if(!ok||V)console.log((ok?'✓ ':'✗ ')+n+(i!==undefined?'  '+(typeof i=='string'?i:JSON.stringify(i)):''))};
const dd=(a,b)=>Math.round((Date.UTC(...a.split('-').map((x,i)=>i==1?x-1:+x))-Date.UTC(...b.split('-').map((x,i)=>i==1?x-1:+x)))/86400000);

console.log('— تحويل الهجري —');
T('1 محرم 1448 ≈ 16-17 يونيو 2026',['2026-06-16','2026-06-17'].includes(EX.hijriToISO(1448,1,1)),EX.hijriToISO(1448,1,1));
T('1 رمضان 1447 ≈ 18-19 فبراير 2026',['2026-02-18','2026-02-19'].includes(EX.hijriToISO(1447,9,1)),EX.hijriToISO(1447,9,1));
T('15 رمضان 1447 ≈ 4 مارس 2026 (±1)',Math.abs(dd(EX.hijriToISO(1447,9,15),'2026-03-04'))<=1,EX.hijriToISO(1447,9,15));
T('1 محرم 1 هـ خارج النطاق المقبول',EX.hijriToISO(1,1,1)==''&&EX.hijriToISO(1600,1,1)=='');
T('شهر 13 / يوم 31 / صفر مرفوضة',EX.hijriToISO(1447,13,1)==''&&EX.hijriToISO(1447,1,31)==''&&EX.hijriToISO(1447,1,0)=='');
/* اتساق داخلي: أيام الشهر متتالية، وطول السنة 354 أو 355 */
let okSeq=true,okLen=true;
for(let y=1400;y<=1460;y++){for(let m=1;m<=12;m++)for(let d=1;d<29;d++){if(dd(EX.hijriToISO(y,m,d+1),EX.hijriToISO(y,m,d))!=1)okSeq=false}
 const len=dd(EX.hijriToISO(y+1,1,1),EX.hijriToISO(y,1,1));if(len!=354&&len!=355)okLen=false}
T('الأيام داخل كل شهر متتالية (1400–1460)',okSeq);T('طول كل سنة 354 أو 355',okLen);
/* مقارنة مع أم القرى في ICU عند توفره: الفرق ≤ يوم واحد. نقيس أقصى فرق فعلي ونسجّله */
let maxd=-1,n=0,unavailable=false;
try{const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
 const back=iso=>{const[a,b,c]=iso.split('-').map(Number),p=f.formatToParts(new Date(Date.UTC(a,b-1,c))),g=t=>+p.find(x=>x.type==t).value;return[g('year'),g('month'),g('day')]};
 if(back('2026-03-04')[0]!=1447)unavailable=true;
 else for(let y=1430;y<=1460;y++)for(let m=1;m<=12;m++)for(const d of[1,10,20,29]){const iso=EX.hijriToISO(y,m,d);let best=9;for(let k=-3;k<=3;k++){const t=new Date(Date.UTC(...iso.split('-').map((x,i)=>i==1?x-1:+x))+k*864e5).toISOString().slice(0,10),h=back(t);if(h[0]==y&&h[1]==m&&h[2]==d)best=Math.min(best,Math.abs(k))}maxd=Math.max(maxd,best);n++}}catch(e){unavailable=true}
if(unavailable)console.log('(تنبيه) ICU لا يدعم أم القرى هنا — تُخطّى مقارنة المرجع');else T('أقصى فرق عن أم القرى ≤ يومين في '+n+' تاريخاً (فعلياً '+maxd+') — لذلك التنبيه «يوماً أو يومين» وليس «±1»',maxd>=0&&maxd<=2,{maxd,n});

console.log('— استخراج التاريخ الهجري —');
const run=t=>EX.run([{name:'ص1',text:t,conf:95}]).items;
let it=run('بجلسة 15 رمضان 1447 هـ');const h=it.filter(o=>o.type=='date');
T('الهجري يحمل تقديراً ميلادياً ويبقى iso فارغاً (لا اعتماد تلقائي)',h.length==1&&h[0].hijri=='1447/09/15'&&h[0].iso==''&&/^2026-03-0[345]$/.test(h[0].giso),h[0]);
T('هجري بلا iso لا يدخل خطة القضية',EX.caseEntries(h.map(o=>Object.assign({},o,{on:true,kind:'جلسة'})),{today:'2026-01-01'}).sessions.length==0);

console.log('— خطة الاعتماد في القضية —');
const mk=(iso,kind,o)=>Object.assign({type:'date',id:'x'+iso+kind,on:true,iso,kind,time:''},o||{});
const base=[mk('2026-12-10','جلسة',{time:'09:30'}),mk('2026-12-20','ميعاد'),mk('2026-12-05','إعلان'),mk('2026-12-06','حكم'),mk('1990-05-01','ميلاد')];
let p=EX.caseEntries(base,{today:'2026-11-23',doc:'توكيل أحمد'});
T('جلسة واحدة وميعاد واحد',p.sessions.length==1&&p.deadlines.length==1,p);
T('بقية الأنواع تُعدّ ولا تدخل (3)',p.other==3);
T('الجلسة بوقتها وملاحظة المصدر',p.sessions[0].time=='09:30'&&p.sessions[0].note=='من مستند: توكيل أحمد'&&p.sessions[0].done===false,p.sessions[0]);
T('عنوان الميعاد يحمل اسم المستند',p.deadlines[0].title=='ميعاد — توكيل أحمد'&&p.deadlines[0].end=='2026-12-20',p.deadlines[0]);
p=EX.caseEntries([mk('2026-10-01','جلسة'),mk('2026-11-23','جلسة'),mk('2026-10-02','ميعاد')],{today:'2026-11-23'});
T('الجلسة الفائتة تُسجَّل منجزة، وجلسة اليوم قادمة',p.sessions.length==2&&p.sessions[0].done===true&&p.sessions[1].done===false,p.sessions);
T('الميعاد الفائت يُترك مع سبب',p.deadlines.length==0&&p.skipped.length==1&&p.skipped[0].reason=='ميعاد منتهٍ',p.skipped);
p=EX.caseEntries([mk('2026-12-10','جلسة',{time:'09:30'}),mk('2026-12-10','جلسة',{time:'11:00'}),mk('2026-12-11','جلسة')],{today:'2026-11-23',sessions:[{date:'2026-12-10',time:'09:30'},{date:'2026-12-11',time:''}]});
T('تكرار قائم (نفس اليوم والساعة؛ أو يوم بلا ساعة) يُتخطّى، وساعة مختلفة تُضاف',p.sessions.length==1&&p.sessions[0].time=='11:00'&&p.skipped.length==2,p);
p=EX.caseEntries([mk('2026-12-10','جلسة'),mk('2026-12-10','جلسة',{id:'dup'})],{today:'2026-11-23'});
T('تكرار داخل الدفعة نفسها يُتخطّى',p.sessions.length==1&&p.skipped.length==1);
p=EX.caseEntries([mk('2026-12-20','ميعاد')],{today:'2026-11-23',deadlines:[{end:'2026-12-20',title:'x'}]});
T('ميعاد مسجَّل بالتاريخ نفسه يُتخطّى',p.deadlines.length==0&&p.skipped[0].reason=='مسجّل من قبل');
p=EX.caseEntries([mk('2026-12-10','جلسة',{on:false}),mk('','جلسة'),{type:'case',on:true,no:'1'}],{today:'2026-11-23'});
T('غير المؤشَّر وبلا تاريخ وغير التواريخ لا تدخل',p.sessions.length==0&&p.other==0&&p.skipped.length==0);
p=EX.caseEntries([mk('2026-12-10','جلسة',{approx:true})],{today:'2026-11-23'});
T('علامة التقريب تنتقل للمعاينة',p.sessions[0].approx===true);
const frozen=[mk('2026-12-10','جلسة')];const snap=JSON.stringify(frozen);EX.caseEntries(frozen,{today:'2026-11-23'});
T('الدالة لا تعدّل مدخلاتها',JSON.stringify(frozen)==snap);
p=EX.caseEntries([mk('2026-12-10','جلسة')],{today:'2026-11-23',doc:'م'.repeat(300)});
T('الملاحظة لا تتجاوز 100 حرف وعنوان الميعاد 80',p.sessions[0].note.length==100&&EX.caseEntries([mk('2026-12-20','ميعاد')],{today:'2026-11-23',doc:'م'.repeat(300)}).deadlines[0].title.length==80);
p=EX.caseEntries([mk('2026-12-12','جلسة',{time:'14:00'}),mk('2026-12-10','جلسة',{time:'09:00'})],{today:'2026-11-23'});
T('الترتيب زمني',p.sessions.map(s=>s.date).join()=='2026-12-10,2026-12-12');

console.log('— Excel والملخص —');
const res={items:[Object.assign(mk('2026-12-10','جلسة'),{raw:'10/12/2026',pg:'ص1'}),Object.assign({type:'date',id:'h',on:true,iso:'',hijri:'1447/09/15',giso:'2026-03-04',kind:'جلسة',raw:'15 رمضان',pg:'ص1'}),Object.assign(mk('2026-03-04','جلسة',{approx:true,hijri:'1447/09/15',giso:'2026-03-04'}),{raw:'15 رمضان',pg:'ص1'})],tables:[]};
const S=EX.sheetsOf(res,{today:'2026-11-23'}),ds=S.find(s=>s.name=='التواريخ');
T('ورقة التواريخ تحتفظ بترتيب الأعمدة القديمة وتضيف عمودين في النهاية',ds.rows[0].slice(0,6).join()=='التاريخ,النوع,الوقت,هجري,النص الأصلي,الصفحة'&&ds.rows[0].length==8,ds.rows[0]);
T('الهجري غير المعتمد: التقدير في عمود التقدير لا عمود التاريخ',ds.rows[2][0]===''&&ds.rows[2][6]&&ds.rows[2][6].d=='2026-03-04'&&/لم يُعتمد/.test(ds.rows[2][7]),ds.rows[2]);
T('المحوَّل من الهجري يحمل ملاحظة التقريب',ds.rows[3][0].d=='2026-03-04'&&/تقريبي/.test(ds.rows[3][7]),ds.rows[3]);
const st=EX.summaryText(res,{});T('الملخص يذكر التقدير والتقريب',/≈ 2026-03-04 تقريباً/.test(st)&&/محوَّل من هجري، تقريبي/.test(st),st);
const b=EX.xlsxBytes(S);T('ملف xlsx يُبنى (توقيع ZIP)',b[0]==0x50&&b[1]==0x4b&&b.length>500,b.length);

console.log(`\nنجح ${P} وفشل ${F}`);process.exit(F?1:0);
