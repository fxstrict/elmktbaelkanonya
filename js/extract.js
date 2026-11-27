/* الحسام سكان — المرحلة N8 (1.17.1): استخراج بيانات قانونية بالقواعد من نص OCR (تواريخ، أرقام قضايا، محاكم، أطراف، تشريعات مذكورة) واستخراج الجداول، مع مراجعة بشرية وتصدير Excel/CSV.
   بالقواعد (تعابير نمطية وهندسة مواضع الكلمات) وليس بالذكاء الاصطناعي: قد يخطئ أو يفوّت، فكل نتيجة «مقترح» تراجعه وتعدّله وتؤشّر عليه قبل التصدير؛ غير المؤشَّر عليه لا يُصدَّر.
   الجزء الأول (EX) دالّات نقية بلا DOM تعمل في Node للاختبار؛ الجزء الثاني واجهة. لا مفاتيح localStorage جديدة، ولا يُكتب شيء في القضايا، ولا شيء يُرفع لأي خادم. إضافة فقط: لا يُعدَّل أي منطق قائم. */
const EX=(function(){
 const AD='٠١٢٣٤٥٦٧٨٩',PD='۰۱۲۳۴۵۶۷۸۹',LET='ء-يA-Za-z';
 /* clean: النص المعروض (بلا تشكيل ولا تطويل ولا علامات اتجاه). norm: نسخة مطابقة بنفس الطول حرفاً بحرف (توحيد الهمزات والتاء المربوطة والألف المقصورة والأرقام) لتُستعمل مواضعها على النص المعروض */
 const clean=s=>String(s==null?'':s).replace(/\r/g,'').replace(/[ً-ٰٟـ‎‏‪-‮⁦-⁩]/g,'').replace(/[ \t ]+/g,' ');
 const norm=s=>s.replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ئ/g,'ي').replace(/ؤ/g,'و').replace(/[٠-٩]/g,c=>AD.indexOf(c)).replace(/[۰-۹]/g,c=>PD.indexOf(c)).replace(/٫/g,'.').replace(/٬/g,',');
 const rx=(src,fl)=>new RegExp(norm(src),fl==null?'g':fl);
 const set=l=>new Set(l.split('|').map(norm));
 const lineB=(t,i)=>{const s=t.lastIndexOf('\n',i-1)+1,e=t.indexOf('\n',i);return[s,e<0?t.length:e]};
 const snip=(ct,s,e)=>{const[ls,le]=lineB(ct,s),a=Math.max(ls,s-38),b=Math.min(le,e+38);return{pre:(a>ls?'…':'')+ct.slice(a,s),m:ct.slice(s,e),post:ct.slice(e,b)+(b<le?'…':'')}};
 const validYMD=(y,m,d)=>{if(!(m>=1&&m<=12&&d>=1&&d<=31))return false;const t=new Date(Date.UTC(y,m-1,d));return t.getUTCFullYear()==y&&t.getUTCMonth()==m-1&&t.getUTCDate()==d};
 const p2=n=>String(n).padStart(2,'0');
 /* ---------------- تحويل هجري ← ميلادي (N10) ----------------
    حساب جدولي مدني بحت (دورة 30 سنة)، لا مصدر خارجياً. التقويم الهجري الرسمي مبني على الرؤية فقد يختلف الناتج عنه بيوم، وفي نحو 4% من الحالات بيومين (قيس على أم القرى في 1440–1450)؛
    لذلك يُعرض دائماً «تقريبي» ولا يدخل أي بيانات قضية بلا تأكيد صريح منك. */
 const jdnToGreg=j=>{let l=j+68569;const n=Math.floor(4*l/146097);l-=Math.floor((146097*n+3)/4);const i=Math.floor(4000*(l+1)/1461001);l=l-Math.floor(1461*i/4)+31;const k=Math.floor(80*l/2447),d=l-Math.floor(2447*k/80);l=Math.floor(k/11);return[100*(n-49)+i+l,k+2-12*l,d]};
 const hijriToISO=(y,m,d)=>{y=+y;m=+m;d=+d;if(!(y>=1300&&y<=1500&&m>=1&&m<=12&&d>=1&&d<=30))return'';const j=d-1+Math.ceil(29.5*(m-1))+(y-1)*354+Math.floor((3+11*y)/30)+1948440,g=jdnToGreg(j);return g[0]+'-'+p2(g[1])+'-'+p2(g[2])};
 /* ---------------- التواريخ ---------------- */
 const MON=[[1,'يناير|كانون الثاني|جانفي'],[2,'فبراير|شباط|فيفري'],[3,'مارس|آذار'],[4,'أبريل|ابريل|نيسان|أفريل'],[5,'مايو|أيار|ماي'],[6,'يونيو|يونيه|يونية|حزيران|جوان'],[7,'يوليو|يوليه|يولية|تموز|جويلية'],[8,'أغسطس|اغسطس|آب|غشت'],[9,'سبتمبر|أيلول'],[10,'أكتوبر|اكتوبر|تشرين الأول'],[11,'نوفمبر|تشرين الثاني'],[12,'ديسمبر|كانون الأول']];
 const HIJ=[[1,'محرم'],[2,'صفر'],[3,'ربيع الأول'],[4,'ربيع الثاني|ربيع الآخر'],[5,'جمادى الأولى'],[6,'جمادى الآخرة|جمادى الثانية'],[7,'رجب'],[8,'شعبان'],[9,'رمضان'],[10,'شوال'],[11,'ذو القعدة|ذي القعدة'],[12,'ذو الحجة|ذي الحجة']];
 const mk=l=>{const m=new Map();l.forEach(([n,s])=>s.split('|').forEach(x=>m.set(norm(x),n)));return{m,alt:[...m.keys()].sort((a,b)=>b.length-a.length).join('|')}};
 const GM=mk(MON),HM=mk(HIJ);
 const PRE='(?:^|[^ء-ي])[وفبلك]{0,2}(?:ال)?';
 const KINDS=[['جلسة',rx(PRE+'(?:جلس[هة]|مرافع|تاجيل|تاجل|للنظر|نظر الدعوي)','g')],['حكم',rx(PRE+'(?:حكم|قضت|قضي|منطوق|صدر|قرار)','g')],['إعلان',rx(PRE+'(?:اعلان|اعلن|اعلام|تسليم|تسلم|اخطار|انذار|اعذار)','g')],['ميعاد',rx(PRE+'(?:ميعاد|موعد|اجل|مهل[هة]|ينتهي|خلال|استحقاق|سداد)','g')],['ميلاد',rx(PRE+'(?:ميلاد|مواليد|ولد)','g')],['رفع/قيد',rx(PRE+'(?:اقام|اقامه|رفع|قيد|ايداع|اودع|قيدت)','g')],['تحرير',rx(PRE+'(?:تحريرا|تحرير|حرر|مؤرخ|ابرم|توقيع)','g')]];
 const kindOf=(nt,s,e)=>{const[ls,le]=lineB(nt,s),bw=nt.slice(Math.max(ls,s-50),s),aw=nt.slice(e,Math.min(le,e+9));let b=null,a=null;
  for(const[k,re]of KINDS){re.lastIndex=0;let m,lastB=-1;while((m=re.exec(bw)))lastB=m.index+m[0].length;if(lastB>=0){const d=bw.length-lastB;if(!b||d<b.d)b={k,d}}
   re.lastIndex=0;m=re.exec(aw);if(m){const d=m.index+1;if(!a||d<a.d)a={k,d}}}
  /* ما قبل التاريخ أقوى دلالة («جلسة 22/11/2026»)؛ ما بعده يُعتمد فقط إن لاصقه */
  return b&&b.d<=42?b.k:a?a.k:'عام'};
 const timeAfter=(nt,e)=>{const[,le]=lineB(nt,e),m=/^[^\n]{0,30}?(?:الساعه|\sس(?=\s*\d))\s*(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(صباحا|مساء|ظهرا|(?:م|ص)(?![ء-ي]))?/.exec(nt.slice(e,le));
  if(!m)return'';let h=+m[1],mi=m[2]?+m[2]:0;if(h>23||mi>59)return'';const pm=/^(مساء|م)$/.test(m[3]||'');if(pm&&h<12)h+=12;if(m[3]=='ظهرا'&&h<11)h+=12;return p2(h)+':'+p2(mi)};
 function findDates(ct,nt){const out=[],used=[];
  const free=(s,e)=>!used.some(u=>s<u[1]&&e>u[0]);
  const add=(s,e,o)=>{if(!free(s,e))return;used.push([s,e]);out.push(Object.assign({type:'date',s,e,raw:ct.slice(s,e)},o))};
  let re=rx('(^|[^\\d])(\\d{1,2})\\s*(?:من\\s+)?(?:شهر\\s+)?('+GM.alt+')\\s*(?:سنة|عام|لسنة)?\\s*[\\/\\-،,]?\\s*(\\d{4})(?!\\d)'),m;
  while((m=re.exec(nt))){const d=+m[2],mo=GM.m.get(m[3]),y=+m[4],s=m.index+m[1].length,e=m.index+m[0].length;
   if(y>=1900&&y<=2100&&validYMD(y,mo,d))add(s,e,{iso:y+'-'+p2(mo)+'-'+p2(d),conf:0.95})}
  re=rx('(^|[^\\d])(\\d{1,2})\\s*(?:من\\s+)?(?:شهر\\s+)?('+HM.alt+')\\s*(?:سنة|عام)?\\s*(\\d{4})(?!\\d)');
  while((m=re.exec(nt))){const d=+m[2],mo=HM.m.get(m[3]),y=+m[4],s=m.index+m[1].length,e=m.index+m[0].length;
   if(y>=1300&&y<=1500&&d>=1&&d<=30){const rest=nt.slice(e,e+8);const ex=/^\s*(?:هـ|ه|هجريه)/.exec(rest);add(s,e+(ex?ex[0].length:0),{iso:'',hijri:y+'/'+p2(mo)+'/'+p2(d),giso:hijriToISO(y,mo,d),conf:0.85})}}
  re=/(^|[^\d\/.\-])(\d{1,2})\s*([\/\-.])\s*(\d{1,2})\s*\3\s*(\d{4}|\d{2})(?!\d)(?![\/\-.]\d)/g;
  while((m=re.exec(nt))){const d=+m[2],mo=+m[4];let y=+m[5];const two=m[5].length==2;if(two)y+=y<=69?2000:1900;
   const s=m.index+m[1].length,e=m.index+m[0].length;if(y<1900||y>2100||!validYMD(y,mo,d))continue;
   const amb=d<=12&&mo<=12&&d!=mo;add(s,e,{iso:y+'-'+p2(mo)+'-'+p2(d),conf:two?0.6:amb?0.85:0.93,amb})}
  re=/(^|[^\d\/.\-])(\d{4})\s*([\/\-.])\s*(\d{1,2})\s*\3\s*(\d{1,2})(?!\d)(?![\/\-.]\d)/g;
  while((m=re.exec(nt))){const y=+m[2],mo=+m[4],d=+m[5],s=m.index+m[1].length,e=m.index+m[0].length;if(y<1900||y>2100||!validYMD(y,mo,d))continue;add(s,e,{iso:y+'-'+p2(mo)+'-'+p2(d),conf:0.9})}
  out.forEach(o=>{o.kind=kindOf(nt,o.s,o.e);if(o.kind=='عام')o.conf=Math.min(o.conf,0.8);o.time=(o.kind=='جلسة'||o.kind=='عام')?timeAfter(nt,o.e):''});
  return out}
 /* ---------------- أرقام القضايا والتشريعات ---------------- */
 const CKW='القضية|الدعوى|الدعوة|الطعن|الجنحة|الجناية|المحضر|الاستئناف|الإشكال|التنفيذ|الشكوى|البلاغ|الملف|التظلم|الالتماس|الأمر|الاعتراض|القيد';
 const CTYPES=['مدني','كلي','جزئي','جنح','جنايات','جناية','مستأنف','مستأنفة','أسرة','عمال','عمالية','إيجارات','تجاري','اقتصادية','إدارية','إداري','تنفيذ','مستعجل','مستعجلة','أحوال شخصية','نفقة','نقض','مخدرات','شيكات','ملكية','تعويضات','أمور وقتية','كلى','جزئى'].map(norm);
 const LAWB=rx('(?:قانون|القانون|بقانون|قرار|القرار|بقرار|لائحة|اللائحة|مرسوم|بمرسوم|دستور|المادة|مادة|الدستور)\\s*(?:(?:رئيس الجمهورية|رئيس مجلس الوزراء|وزير\\S*|المجلس\\S*|الاتحادي)(?:\\s+\\S+){0,3})?\\s*$','');
 const LAWK=rx('(قانون|القانون|بقانون|قرار|القرار|بقرار|لائحة|اللائحة|مرسوم|بمرسوم)','');
 const afterTypes=(nt,e)=>{let i=e,out=[];for(let k=0;k<3;k++){const m=/^[ \t]*([ء-ي]+)/.exec(nt.slice(i));if(!m)break;const w=m[1];if(CTYPES.includes(w)||(w=='ق'))out.push(w);else break;i+=m[0].length}return{t:out,e:i}};
 function findCases(ct,nt){const out=[],laws=[];
  const re=rx('(?:('+CKW+')\\s*(?:المقيدة|المقيد)?\\s*)?(?:تحت رقم|برقم|رقم)\\s*[\\(\\[]?\\s*(\\d{1,7})\\s*[\\)\\]]?\\s*(?:\\/|\\-|لسنة|لعام|سنة)\\s*[\\(\\[]?\\s*(\\d{2,4})\\s*[\\)\\]]?(?:\\s*(قضائية|ق(?![ء-ي])))?'),bare=rx('(^|[^\\d\\/.\\-])(\\d{1,7})\\s*لسنة\\s*(\\d{4})(?!\\d)');
  const seen=[];let m;
  const emit=(s,e,no,yr,kw,jud,ty,conf)=>{const bs=Math.max(lineB(nt,s)[0],s-28),bf=nt.slice(bs,s);
   if(LAWB.test(bf)||(!kw&&LAWK.test(bf.slice(-14)))){const g=new RegExp(LAWK.source,'g');let km,last=null;while((km=g.exec(bf)))last=km;
    const ks=last?bs+last.index:s;laws.push({type:'law',s:ks,e,raw:ct.slice(ks,e).trim(),kind:last?ct.slice(ks,ks+last[0].length).replace(/^ب(?=ق)/,''):'قانون',no,year:yr,conf:0.8});return}
   out.push({type:'case',s,e,raw:ct.slice(s,e).trim(),kind:kw?ct.slice(s,s+kw.length):'',no,year:yr,judicial:jud,ctype:ty,conf})};
  while((m=re.exec(nt))){const yr=m[3];if(/^\s*[\/\-]\s*\d/.test(nt.slice(m.index+m[0].length,m.index+m[0].length+4)))continue;
   const y=+yr;let conf=0.9;const jud=!!m[4]&&/^ق/.test(m[4]);if(yr.length==2&&!jud)conf=0.6;else if(yr.length==4&&(y<1950||y>2100))conf=0.55;else if(yr.length==3)conf=0.5;
   const at=afterTypes(nt,m.index+m[0].length),e=at.t.length?at.e:m.index+m[0].length;seen.push([m.index,e]);
   const ty=at.t.filter(x=>x!='ق').map(w=>ct.substr(nt.indexOf(w,m.index+m[0].length),w.length)).join(' ');
   emit(m.index,e,m[2],yr+(jud?'':''),m[1]?ct.slice(m.index,m.index+m[1].length):'',jud,ty,conf)}
  while((m=bare.exec(nt))){const s=m.index+m[1].length,e0=m.index+m[0].length;if(seen.some(u=>s<u[1]&&e0>u[0]))continue;
   const at=afterTypes(nt,e0),bf=nt.slice(Math.max(lineB(nt,s)[0],s-24),s),hasKw=rx('(?:'+CKW+')','').test(bf);
   if(!at.t.length&&!hasKw){const lawish=LAWB.test(bf)||LAWK.test(bf.slice(-14));if(lawish)emit(s,e0,m[2],m[3],'',false,'',0.7);continue}
   const ty=at.t.filter(x=>x!='ق').map(w=>ct.substr(nt.indexOf(w,e0),w.length)).join(' ');emit(s,at.t.length?at.e:e0,m[2],m[3],'',false,ty,0.65)}
  return{cases:out,laws}}
 /* ---------------- المحاكم ---------------- */
 const CSTOP=set('برقم|رقم|في|بتاريخ|الدائرة|دائرة|لسنة|المقامة|والمقامة|بجلسة|الموقرة|حكمت|قضت|أصدرت|وفي|التي|الذي|بعد|قد|أن|من|إلى|على|عن|ضد|و|ب|ل|والتي|فيها|المنعقدة|بهيئة|برئاسة|حيث|لدى|أمام|ومن|وقد|الا|إلا|ثم|هذه|هذا|عليه|عليها|بالدعوى|الدعوى|القضية|وذلك|مع');
 const KCOURT=rx('محكمة\\s+(?:النقض|الاستئناف|الجنايات|الجنح|الاسرة|الاقتصادية|الدستورية|القضاء|الامور|التنفيذ|الجنح)','');
 function findCourts(ct,nt){const out=[],re=rx('(^|[^ء-ي])(?:ب|ل|و)?(محكمة\\s+[ء-ي]+)','g');let m;
  while((m=re.exec(nt))){const s=m.index+m[1].length+(m[0].length-m[1].length-m[2].length),st=s;let i=st+'محكمة'.length,toks=[];
   for(;;){const sp=/^ +/.exec(nt.slice(i));if(!sp)break;const j=i+sp[0].length,w=/^[ء-ي]+/.exec(nt.slice(j));if(!w)break;if(CSTOP.has(w[0])||toks.length>=5)break;toks.push([j,j+w[0].length]);i=j+w[0].length}
   if(!toks.length)continue;const e=toks[toks.length-1][1];const nm=ct.slice(st,e);out.push({type:'court',s:st,e,raw:nm,name:nm,conf:toks.length>=2||KCOURT.test(norm(nm))?0.8:0.6})}
  return out}
 /* ---------------- الأطراف ---------------- */
 const ROLES=[['مدعٍ بالحق المدني','المدعي بالحق المدني|المدعية بالحق المدني'],['مدعى عليه','المدعى عليه|المدعى عليها|المدعى عليهم|المدعى عليهما|المدعي عليه'],['مدعٍ','المدعي|المدعية|المدعون|المدعيان'],['مستأنف ضده','المستأنف ضده|المستأنف ضدها|المستأنف ضدهم|المستأنف عليه|المستأنف عليها'],['مستأنف','المستأنف|المستأنفة|المستأنفون'],['مطعون ضده','المطعون ضده|المطعون ضدها|المطعون ضدهم'],['طاعن','الطاعن|الطاعنة|الطاعنون'],['متهم','المتهم|المتهمة|المتهمون'],['مجني عليه','المجني عليه|المجني عليها'],['محكوم عليه','المحكوم عليه|المحكوم عليها'],['محكوم له','المحكوم له|المحكوم لها'],['مطلوب ضده','المطلوب ضده|المطلوب ضدها|المنفذ ضده|المنفذ ضدها|المطلوب التنفيذ ضده'],['طالب','طالب التنفيذ|الطالب|الطالبة'],['معلن إليه','المعلن إليه|المعلن إليها|المعلن إليهم'],['معلن','المعلن|المعلنة|المعلنون'],['موكل','الموكل|الموكلة'],['متدخل','الخصم المتدخل|المتدخل']];
 const TITLES=set('السيد|السيدة|السيده|السادة|الاستاذ|الأستاذ|الاستاذة|الأستاذة|الدكتور|الدكتورة|المهندس|المهندسة|المستشار|الحاج|الحاجة|الشيخ|المدعو|المدعوة|المسمى|المسماة|السيدان');
 const ORD=set('الأول|الأولى|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة');
 const RESID=set('المقيم|المقيمة|ومقيم|ومقيمة|مقيم|مقيمة|والمقيم|والمقيمة|ومحله|ومحل|محله|بصفته|بصفتها|وبصفته|وبصفتها|الكائن|الساكن|الساكنة|ويقيم|عنوانه|وموطنه|الحامل|حامل|ومقره|مقره|ويعلن|ويمثله|وكيله|والمقيمان|ومهنته|الجنسية|المصري|المصرية');
 const STOP=new Set([...RESID,...set('ورقم|ضد|ضده|ضدها|قد|قام|أقام|ويطلب|يطلب|بموجب|والمعلن|الذي|التي|فقد|حيث|أن|إن|انه|إنه|إنها|أنها|أنه|من|إلى|الى|عن|في|و|أو|بأن|لأن|ثم|كما|وهو|وهي|هو|هي|بطلب|لم|لا|ما|كان|كانت|يكون|تقدم|حضر|يحضر|تخلف|طلب|طلبت|قدم|قدمت|أودع|أوضح|قرر|يقرر|يعلن|أعلن|دفع|يقدم|حضرت|تغيب|وكل|تنازل|الرقم|رقم|القومي|صاحب|صاحبة|ويسكن|وسكنه|اللذان|الذين|اللتان|بتاريخ|بجلسة|المحامي|المحامية|الأول|الأولى|الثاني|الثانية|الثالث|الثالثة|بوصفه|بوصفها|عليه|عليها|يؤكد|يدفع|يطعن|طعن|استأنف|يستأنف|وطلب|ونطلب|ونصت|ينازع|نازع|ويطلبون|اعلنه|أعلنه|اعلانه|إعلانه')]);
 const roleRes=ROLES.map(([lab,alt])=>[lab,rx('(^|[^ء-ي])[وف]?('+alt+')(?![ء-ي])')]);
 function parseName(ct,nt,pos,opt){opt=opt||{};let i=pos,sep=false,tit=false;
  const sp=()=>{while(i<nt.length&&(nt[i]==' '||nt[i]=='\t'))i++};
  const seps=()=>{for(;;){sp();if(i<nt.length&&':：-–—/\\|'.includes(nt[i])){sep=true;i++}else break}};
  seps();
  if(i>=nt.length||nt[i]=='\n'){if(!sep&&!opt.nl)return null;let j=i;while(j<nt.length&&/\s/.test(nt[j]))j++;if(j>=nt.length)return null;i=j}
  for(;;){sp();const w=/^[ء-ي]+/.exec(nt.slice(i));if(w&&TITLES.has(w[0])){tit=true;i+=w[0].length;seps()}else break}
  const toks=[];let term='eol';
  for(;;){sp();const w=/^[ء-ي]+(?:\.[ء-ي]+)+\.?|^[ء-ي]+|^[A-Za-z]+/.exec(nt.slice(i));if(!w){term=i>=nt.length||nt[i]=='\n'?'eol':'punct';break}
   if(STOP.has(w[0])){term=RESID.has(w[0])?'resid':'stop';break}
   if(opt.ordFirst&&!toks.length&&ORD.has(w[0])){i+=w[0].length;continue}
   toks.push([i,i+w[0].length]);i+=w[0].length;if(toks.length>=6){term='max';break}
   if(i<nt.length&&nt[i]!=' '&&nt[i]!='\t'){term=nt[i]=='\n'?'eol':'punct';break}}
  if(!toks.length)return null;
  return{s:toks[0][0],e:toks[toks.length-1][1],n:toks.length,sep,tit,term,name:ct.slice(toks[0][0],toks[toks.length-1][1]),end:i}}
 function findParties(ct,nt){const out=[],used=[],hits=[];
  const ov=(s,e)=>used.some(u=>s<u[1]&&e>u[0]);
  roleRes.forEach(([lab,re])=>{re.lastIndex=0;let m;while((m=re.exec(nt))){const s=m.index+m[1].length+(m[0].length-m[1].length-m[2].length),e=s+m[2].length;if(ov(s,e))continue;used.push([s,e]);hits.push({lab,s,e})}});
  hits.sort((a,b)=>a.s-b.s);
  const spans=[];
  hits.forEach(h=>{let p=h.e,ordTxt='';const om=/^[ \t]*([ء-ي]+)/.exec(nt.slice(p));if(om&&ORD.has(om[1])){ordTxt=ct.slice(p+om[0].length-om[1].length,p+om[0].length);p+=om[0].length}
   const r=parseName(ct,nt,p);if(!r)return;if(!ordTxt&&ORD.has(nt.slice(r.s,r.e).split(' ')[0])&&r.n==1)return;
   if(!r.sep&&!r.tit&&r.n<2)return;
   let conf=(r.sep||r.tit)?0.85:0.55;if(r.n==1)conf*=0.75;if(r.term=='max')conf*=0.8;if(r.n>=3&&(r.term=='stop'||r.term=='resid'||r.term=='punct'||r.term=='eol'))conf=Math.min(0.95,conf+0.05);
   spans.push([h.s,r.e]);out.push({type:'party',s:h.s,e:r.e,ns:r.s,ne:r.e,raw:ct.slice(h.s,r.e),role:h.lab+(ordTxt?' '+ordTxt:''),name:r.name,conf})});
  /* «ضد فلان»: خصم لم يُسمَّ دوره */
  {const re=rx('(^|[^ء-ي])(ضد)(?![ء-ي])');let m;while((m=re.exec(nt))){const s=m.index+m[1].length;if(spans.some(u=>s>=u[0]&&s<u[1]))continue;const r=parseName(ct,nt,s+2,{nl:1});if(!r||r.n<2||!(r.sep||r.tit))continue;
   spans.push([s,r.e]);out.push({type:'party',s,e:r.e,ns:r.s,ne:r.e,raw:ct.slice(s,r.e),role:'خصم (ضد)',name:r.name,conf:0.75})}}
  /* «السيد/ فلان المقيم …»: طرف بلا دور ظاهر، يُقبل فقط إن أعقبته كلمة عنوان/صفة */
  {const re=rx('(^|[^ء-ي])(السيد|السيدة|السادة|الأستاذ|الأستاذة|الدكتور|المهندس|المستشار)(?![ء-ي])');let m;while((m=re.exec(nt))){const s=m.index+m[1].length;if(spans.some(u=>s<u[1]&&s+m[2].length>u[0]))continue;
   const r=parseName(ct,nt,s);if(!r||r.n<2||r.term!='resid')continue;if(spans.some(u=>r.s<u[1]&&r.e>u[0]))continue;
   spans.push([s,r.e]);out.push({type:'party',s,e:r.e,ns:r.s,ne:r.e,raw:ct.slice(s,r.e),role:'غير محدد',name:r.name,conf:0.7})}}
  return out}
 /* ---------------- التشغيل على كل الصفحات ---------------- */
 let _id=0;
 function run(pages){const items=[];
  pages.forEach((pg,pi)=>{const ct=clean(pg.text),nt=norm(ct),pc=pg.conf==null?100:pg.conf,low=pc<70?0.85:1;
   const put=(o)=>{o.pi=pi;o.pg=pg.name||('صفحة '+(pi+1));o.sn=snip(ct,o.s,o.e);o.conf=Math.round(o.conf*low*100)/100;o.on=o.conf>=0.7;o.id='x'+(++_id);o.n=1;items.push(o)};
   findDates(ct,nt).forEach(put);const cl=findCases(ct,nt);cl.cases.forEach(put);cl.laws.forEach(put);findCourts(ct,nt).forEach(put);findParties(ct,nt).forEach(put)});
  /* دمج المكرر (نفس النوع والقيم) مع عدّ مرات الظهور وإبقاء أعلى ثقة */
  const key=o=>o.type=='date'?'d|'+(o.iso||o.hijri)+'|'+o.kind:o.type=='case'?'c|'+o.kind+'|'+o.no+'|'+o.year+'|'+o.ctype:o.type=='law'?'l|'+o.kind+'|'+o.no+'|'+o.year:o.type=='court'?'t|'+norm(o.name).replace(/\s+/g,' '):'p|'+o.role+'|'+norm(o.name).replace(/\s+/g,' ');
  const map=new Map(),res=[];items.forEach(o=>{const k=key(o),f=map.get(k);if(f){f.n++;if(o.conf>f.conf){f.conf=o.conf;f.on=o.on;f.sn=o.sn;f.pg=o.pg;f.pi=o.pi}else if(f.pi!==o.pi&&!f.pgs)f.pgs=1}else{map.set(k,o);res.push(o)}});
  res.sort((a,b)=>a.pi-b.pi||a.s-b.s);return{items:res,tables:[]}}
 /* ---------------- الجداول (من مواضع الكلمات) ---------------- */
 const hasAr=t=>/[؀-ۿ]/.test(t);
 function tableFromWords(words,opt){opt=opt||{};if(!words||words.length<6)return[];
  const hs=words.map(w=>w.y1-w.y0).sort((a,b)=>a-b),mh=hs[hs.length>>1]||10,gap=mh*(opt.gap||1.3);
  const ws=words.slice().sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1)),rows=[];
  for(const w of ws){const cy=(w.y0+w.y1)/2,r=rows[rows.length-1];if(r&&Math.abs(cy-r.cy)<=mh*0.6){r.w.push(w);r.cy=(r.cy*(r.w.length-1)+cy)/r.w.length}else rows.push({cy,w:[w]})}
  rows.forEach(r=>{r.w.sort((a,b)=>a.x0-b.x0);const cs=[];r.w.forEach(w=>{const c=cs[cs.length-1];if(c&&w.x0-c.x1<=gap){c.ws.push(w);c.x1=Math.max(c.x1,w.x1)}else cs.push({x0:w.x0,x1:w.x1,ws:[w]})});r.cells=cs});
  const rtl=words.filter(w=>hasAr(w.t)).length*2>=words.length;
  /* كتل الصفوف المتتالية ذات خليتين فأكثر */
  const mr=rows.filter(r=>r.cells.length>=2),pit=[];for(let k=1;k<mr.length;k++)pit.push(mr[k].cy-mr[k-1].cy);pit.sort((a,b)=>a-b);const mp=pit.length?pit[pit.length>>1]:mh*2,maxGap=Math.max(mp*2.5,mh*3);
  const blocks=[];let cur=[];rows.forEach(r=>{if(r.cells.length>=2){if(cur.length&&r.cy-cur[cur.length-1].cy>maxGap){blocks.push(cur);cur=[]}cur.push(r)}else{if(cur.length)blocks.push(cur);cur=[]}});if(cur.length)blocks.push(cur);
  const out=[];
  for(const blk of blocks){if(blk.length<3)continue;
   const cnt=new Map();blk.forEach(r=>cnt.set(r.cells.length,(cnt.get(r.cells.length)||0)+1));let modal=0,mc=0;cnt.forEach((v,k)=>{if(v>mc||(v==mc&&k>modal)){mc=v;modal=k}});
   if(mc<Math.max(2,Math.ceil(blk.length*0.5)))continue;
   /* حدود الأعمدة: اتحاد فترات خلايا الصفوف ذات العدد الغالب */
   const iv=[];blk.filter(r=>r.cells.length==modal).forEach(r=>r.cells.forEach(c=>iv.push([c.x0,c.x1])));iv.sort((a,b)=>a[0]-b[0]);
   const bands=[];iv.forEach(v=>{const b=bands[bands.length-1];if(b&&v[0]<=b[1]){b[1]=Math.max(b[1],v[1])}else bands.push([v[0],v[1]])});
   if(bands.length<2)continue;
   const grid=blk.map(r=>{const row=bands.map(()=>[]);r.cells.forEach(c=>{let bi=-1,bo=0;bands.forEach((b,k)=>{const o=Math.min(b[1],c.x1)-Math.max(b[0],c.x0);if(o>bo){bo=o;bi=k}});if(bi<0){let bd=1e9;bands.forEach((b,k)=>{const d=Math.abs((b[0]+b[1])/2-(c.x0+c.x1)/2);if(d<bd){bd=d;bi=k}})}row[bi].push(...c.ws)});
    return row.map(ws=>{const ar=ws.filter(w=>hasAr(w.t)).length*2>=ws.length;return ws.sort((x,y)=>ar?y.x0-x.x0:x.x0-y.x0).map(w=>w.t).join(' ')})});
   if(rtl)grid.forEach(r=>r.reverse());
   const full=blk.filter(r=>r.cells.length==modal).length/blk.length;
   out.push({rows:grid,cols:bands.length,rtl,conf:Math.round(full*100)/100,y:blk[0].cy,on:full>=0.6})}
  return out}
 /* بديل بلا مواضع (نص فقط، مثل مستند أُعيد فتحه من المكتبة): أسطر مفصولة بـ | أو Tab أو 3 مسافات فأكثر */
 function tableFromText(text){const lines=String(text||'').replace(/\r/g,'').split('\n'),out=[];let cur=[];
  const split=l=>{const t=l.trim();if(/\|/.test(t))return t.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());if(/\t/.test(t))return t.split(/\t+/).map(x=>x.trim());if(/\S {3,}\S/.test(t))return t.split(/ {3,}/).map(x=>x.trim());return[t]};
  const flush=()=>{if(cur.length>=3){const c=new Map();cur.forEach(r=>c.set(r.length,(c.get(r.length)||0)+1));let k=0,m=0;c.forEach((v,n)=>{if(v>m){m=v;k=n}});
    if(k>=2&&m>=Math.ceil(cur.length*0.6)){const rows=cur.map(r=>{r=r.slice(0,k);while(r.length<k)r.push('');return r});out.push({rows,cols:k,rtl:rows.some(r=>r.some(hasAr)),conf:Math.round(m/cur.length*100)/100,y:0,on:m/cur.length>=0.8})}}cur=[]};
  lines.forEach(l=>{const p=split(l);if(p.length>=2)cur.push(p);else flush()});flush();return out}
 /* ---------------- Excel / CSV ---------------- */
 const toNum=s=>{const t=norm(String(s)).replace(/[\s ]/g,'');if(/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))return +t.replace(/,/g,'');if(/^[+-]?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t))return +t;return null};
 const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'');
 const colL=n=>{let s='';n++;while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=(n-r-1)/26|0}return s};
 const serial=iso=>{const[a,b,c]=iso.split('-').map(Number);return Math.round((Date.UTC(a,b-1,c)-Date.UTC(1899,11,30))/86400000)};
 const cellX=(ref,v,hdr)=>{if(v==null||v==='')return'';
  if(typeof v=='number')return`<c r="${ref}"><v>${v}</v></c>`;
  if(v&&typeof v=='object'&&v.d)return`<c r="${ref}" s="2"><v>${serial(v.d)}</v></c>`;
  const s=String(v),n=hdr?null:toNum(s);if(n!=null&&isFinite(n))return`<c r="${ref}"><v>${n}</v></c>`;
  return`<c r="${ref}"${hdr?' s="1"':''} t="inlineStr"><is><t xml:space="preserve">${xe(s)}</t></is></c>`};
 const sName=(n,used)=>{let b=String(n||'ورقة').replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,28)||'ورقة',x=b,k=2;while(used.has(x.toLowerCase())){x=b.slice(0,26)+' '+k++}used.add(x.toLowerCase());return x};
 /* sheets: [{name, rows:[[…]], rtl, hdr:true, w:[عرض الأعمدة]}] — الخلية رقماً أو نصاً أو {d:'YYYY-MM-DD'} */
 function xlsxBytes(sheets){const TE=new TextEncoder(),used=new Set(),mkf=(n,s)=>{const u=TE.encode(s);return{name:n,method:0,time:0,date:0x21,crc:crc32(u),cs:u.length,us:u.length,raw:u}};
  const X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const names=sheets.map(s=>sName(s.name,used));
  const ws=sheets.map((s,k)=>{const nc=Math.max(1,...s.rows.map(r=>r.length)),w=s.w||[];
   const cols='<cols>'+Array.from({length:nc},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${w[i]||18}" customWidth="1"/>`).join('')+'</cols>';
   const sd=s.rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>cellX(colL(ci)+(ri+1),v,s.hdr!==false&&ri==0)).join('')+'</row>').join('');
   return mkf('xl/worksheets/sheet'+(k+1)+'.xml',X+`<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"${s.rtl?' rightToLeft="1"':''}${k==0?' tabSelected="1"':''}/></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${sd}</sheetData></worksheet>`)});
  const wb=X+`<workbook xmlns="${NS}" xmlns:r="${RN}"><bookViews><workbookView/></bookViews><sheets>${names.map((n,k)=>`<sheet name="${xe(n)}" sheetId="${k+1}" r:id="rId${k+1}"/>`).join('')}</sheets></workbook>`;
  const rel=X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_,k)=>`<Relationship Id="rId${k+1}" Type="${RN}/worksheet" Target="worksheets/sheet${k+1}.xml"/>`).join('')}<Relationship Id="rId${names.length+1}" Type="${RN}/styles" Target="styles.xml"/></Relationships>`;
  const st=X+`<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const ct=X+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_,k)=>`<Override PartName="/xl/worksheets/sheet${k+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  return zipWrite([mkf('[Content_Types].xml',ct),mkf('_rels/.rels',X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RN}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),mkf('xl/workbook.xml',wb),mkf('xl/_rels/workbook.xml.rels',rel),mkf('xl/styles.xml',st),...ws])}
 const csvCell=v=>{let s=v&&typeof v=='object'&&v.d?v.d:String(v==null?'':v);if(/^[=@]/.test(s)||/^[+\-][^\d.\s]/.test(s))s="'"+s;return/[",\r\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 const csvText=rows=>'﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';
 const okItem=o=>o.type=='date'?!!(o.iso||o.hijri):o.type=='case'?!!String(o.no||'').trim():o.type=='law'?!!String(o.no||'').trim():!!String(o.name||'').trim();
 /* بناء أوراق المصنف من النتائج المؤشَّر عليها (عناوين الأعمدة عربية والتواريخ خلايا تاريخ حقيقية) */
 function sheetsOf(res,meta){meta=meta||{};const on=t=>res.items.filter(o=>o.type==t&&o.on&&okItem(o)),S=[];
  const sm=[['البند','القيمة'],['اسم المشروع',meta.name||''],['القضية',meta.caseName||''],['الموكل',meta.client||''],['تاريخ الاستخراج',{d:meta.today||''}],['الإصدار',meta.ver||''],['التواريخ المعتمدة',on('date').length],['أرقام القضايا المعتمدة',on('case').length],['المحاكم المعتمدة',on('court').length],['الأطراف المعتمدة',on('party').length],['التشريعات المعتمدة',on('law').length],['الجداول المعتمدة',res.tables.filter(t=>t.on).length],['ملاحظة','استُخرجت البيانات بالقواعد من نص التعرف الضوئي وراجعها المستخدم؛ تحقق منها من المستند الأصلي قبل الاعتماد.']];
  S.push({name:'ملخص',rows:sm,rtl:true,w:[24,60]});
  const D=on('date');if(D.length)S.push({name:'التواريخ',rtl:true,w:[14,12,10,12,50,16,18,30],rows:[['التاريخ','النوع','الوقت','هجري','النص الأصلي','الصفحة','تقدير ميلادي (تقريبي)','ملاحظة'],...D.map(o=>[o.iso?{d:o.iso}:'',o.kind,o.time||'',o.hijri||'',o.raw,o.pg,!o.iso&&o.giso?{d:o.giso}:'',o.approx?'محوَّل من الهجري — تقريبي (قد يختلف يوماً أو يومين)، تحقق':(!o.iso&&o.giso?'هجري لم يُعتمد ميلادياً':'')])]});
  const C=on('case');if(C.length)S.push({name:'القضايا',rtl:true,w:[14,10,10,20,36,16],rows:[['الصفة','الرقم','السنة','النوع/الدائرة','النص الأصلي','الصفحة'],...C.map(o=>[o.kind||'',toNum(o.no)!=null?toNum(o.no):String(o.no),toNum(o.year)!=null?toNum(o.year):String(o.year),(o.ctype||'')+(o.judicial?' (سنة قضائية)':''),o.raw,o.pg])]});
  const T=on('court');if(T.length)S.push({name:'المحاكم',rtl:true,w:[44,16],rows:[['المحكمة','الصفحة'],...T.map(o=>[o.name,o.pg])]});
  const P=on('party');if(P.length)S.push({name:'الأطراف',rtl:true,w:[22,36,50,16],rows:[['الصفة','الاسم','النص الأصلي','الصفحة'],...P.map(o=>[o.role,o.name,o.raw,o.pg])]});
  const L=on('law');if(L.length)S.push({name:'التشريعات',rtl:true,w:[14,10,10,40,16],rows:[['النوع','الرقم','السنة','النص الأصلي','الصفحة'],...L.map(o=>[o.kind,toNum(o.no)!=null?toNum(o.no):String(o.no),toNum(o.year)!=null?toNum(o.year):String(o.year),o.raw,o.pg])]});
  res.tables.filter(t=>t.on).forEach((t,k)=>S.push({name:'جدول '+(k+1),rtl:t.rtl,hdr:true,w:Array.from({length:t.cols},()=>22),rows:t.rows}));
  return S}
 const summaryText=(res,meta)=>{const on=t=>res.items.filter(o=>o.type==t&&o.on&&okItem(o)),L=[];meta=meta||{};if(meta.caseName)L.push('القضية: '+meta.caseName);
  on('case').forEach(o=>L.push('قضية: '+[o.kind,'رقم '+o.no+' لسنة '+o.year,o.ctype].filter(Boolean).join(' ')));on('court').forEach(o=>L.push('محكمة: '+o.name.replace(/^محكمة\s*/,'')));
  on('date').forEach(o=>L.push(o.kind+': '+(o.iso||o.hijri+' هـ'+(o.giso?' (≈ '+o.giso+' تقريباً)':''))+(o.approx?' (محوَّل من هجري، تقريبي)':'')+(o.time?' '+o.time:'')));on('party').forEach(o=>L.push(o.role+': '+o.name));on('law').forEach(o=>L.push(o.kind+' رقم '+o.no+' لسنة '+o.year));return L.join('\n')};
 /* ---------------- اعتماد الجلسات والمواعيد في القضية (N10) ----------------
    دالة نقية تُعدّ «خطة» فقط (لا تكتب شيئاً): التواريخ المؤشَّر عليها بنوع «جلسة» تصير جلسات، و«ميعاد» تصير مواعيد.
    كل نوع آخر يُعدّ ولا يدخل (غيّر نوعه يدوياً إن أردت). الجلسة الفائتة تُسجَّل منجزة كي لا تزحم الأجندة، والميعاد الفائت يُترك.
    التكرار (نفس اليوم، وبنفس الساعة أو بلا ساعة) يُتخطّى. الكتابة الفعلية في الواجهة بعد معاينتك وتأكيدك. */
 function caseEntries(items,opt){opt=opt||{};const today=opt.today||'',doc=String(opt.doc||'').trim()||'مستند ممسوح',exS=opt.sessions||[],exD=opt.deadlines||[],out={sessions:[],deadlines:[],skipped:[],other:0};
  const dup=(a,b)=>a.date==b.date&&(!a.time||!b.time||a.time==b.time);
  (items||[]).filter(o=>o.type=='date'&&o.on&&o.iso).forEach(o=>{const lab=o.iso+(o.time?' '+o.time:'');
   if(o.kind=='جلسة'){const s={date:o.iso,time:o.time||'',note:('من مستند: '+doc).slice(0,100),done:!!(today&&o.iso<today),approx:!!o.approx,src:o.id};
    if(exS.some(x=>dup({date:x.date,time:x.time||''},s))||out.sessions.some(x=>dup(x,s))){out.skipped.push({date:lab,kind:o.kind,reason:'مسجّلة من قبل'});return}out.sessions.push(s)}
   else if(o.kind=='ميعاد'){if(today&&o.iso<today){out.skipped.push({date:lab,kind:o.kind,reason:'ميعاد منتهٍ'});return}
    if(exD.some(x=>x.end==o.iso)||out.deadlines.some(x=>x.end==o.iso)){out.skipped.push({date:lab,kind:o.kind,reason:'مسجّل من قبل'});return}
    out.deadlines.push({end:o.iso,title:('ميعاد — '+doc).slice(0,80),approx:!!o.approx,src:o.id})}
   else out.other++});
  out.sessions.sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1);out.deadlines.sort((a,b)=>a.end<b.end?-1:1);return out}
 return{hijriToISO,jdnToGreg,caseEntries,okItem,clean,norm,run,findDates,findCases,findCourts,findParties,tableFromWords,tableFromText,xlsxBytes,csvText,sheetsOf,summaryText,toNum,parseName,validYMD}
})();
if(typeof module!='undefined'&&module.exports)module.exports=EX;
/* ====================== الواجهة: شاشة المراجعة والتصدير ====================== */
(function(){
 if(typeof document=='undefined'||typeof DP=='undefined')return;
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s));
 const XS={res:null,sig:'',tab:'date',edited:false,load:null};let tid=0;
 const DK=['جلسة','حكم','إعلان','ميعاد','رفع/قيد','تحرير','ميلاد','عام'],ROLEL=['مدعٍ','مدعى عليه','مستأنف','مستأنف ضده','طاعن','مطعون ضده','متهم','مجني عليه','محكوم عليه','محكوم له','طالب','مطلوب ضده','معلن','معلن إليه','موكل','متدخل','خصم (ضد)','غير محدد'];
 const hash=s=>{let h=5381;s=String(s||'');for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h};
 const pagesNow=()=>DP.items.filter(it=>it._ocr&&it._ocr.text!=null);
 const sigNow=()=>pagesNow().map(it=>it.id+':'+hash(it._ocr.text)).join('|');
 /* بصمة النص وحده (بلا معرّفات الصفحات التي تتغير عند إعادة فتح المستند): تربط المراجعة المحفوظة بنص OCR نفسه */
 const tsigNow=()=>pagesNow().map(it=>hash(it._ocr.text)).join('|');
 const act=a=>{const b=document.createElement('button');b.dataset.act=a;b.style.display='none';document.body.appendChild(b);try{b.click()}finally{b.remove()}};
 function build(){const ps=pagesNow(),res=EX.run(ps.map(it=>({name:it.name,text:it._ocr.text,conf:it._ocr.conf})));
  ps.forEach((it,k)=>{const o=it._ocr;/* كلمات OCR مخزّنة بترتيب بصري (للطبقة النصية في PDF)؛ fixRtl عملية ذاتية العكس فتعيدها منطقية */const un=w=>typeof OC!='undefined'&&OC.fixRtl?Object.assign({},w,{t:OC.fixRtl(w.t)}):w;let ts=o.words&&o.words.length?EX.tableFromWords(o.words.map(un)):[];if(!ts.length)ts=EX.tableFromText(o.text);ts.forEach(t=>{t.pg=it.name;t.pi=k;t.id='t'+(++tid);res.tables.push(t)})});
  return res}
 const cnt=t=>XS.res.items.filter(o=>o.type==t).length;
 const sel=(f,v,l)=>`<select data-xf="${f}">${l.map(x=>`<option${x==v?' selected':''}>${E(x)}</option>`).join('')}${l.includes(v)||!v?'':`<option selected>${E(v)}</option>`}</select>`;
 const inp=(f,v,ph,extra)=>`<input data-xf="${f}" value="${E(v)}" placeholder="${E(ph||'')}" ${extra||''}>`;
 function fields(o){
  if(o.type=='date')return o.hijri&&!o.iso?`<input class="w2" value="${E(o.hijri)} هـ (هجري)${o.giso?' ≈ '+E(o.giso)+' تقريباً':''}" readonly aria-label="تاريخ هجري">${o.giso?'<button class="pb" data-act="exhij" data-id="'+o.id+'" aria-label="تحويل إلى ميلادي تقريبي" title="تحويل إلى ميلادي تقريبي">⇄</button>':''}${sel('kind',o.kind,DK)}`:`<input type="date" data-xf="iso" value="${E(o.iso)}" aria-label="التاريخ">${sel('kind',o.kind,DK)}<input type="time" data-xf="time" value="${E(o.time||'')}" aria-label="الساعة" class="w2">`;
  if(o.type=='case')return inp('kind',o.kind,'الصفة (قضية/طعن…)')+inp('ctype',o.ctype,'النوع (مدني كلي…)')+inp('no',o.no,'الرقم','inputmode="numeric"')+inp('year',o.year,'السنة','inputmode="numeric"');
  if(o.type=='law')return inp('kind',o.kind,'قانون/قرار')+inp('no',o.no,'الرقم','inputmode="numeric"')+inp('year',o.year,'السنة','inputmode="numeric"');
  if(o.type=='court')return inp('name',o.name,'اسم المحكمة','class="w2"');
  return inp('role',o.role,'الصفة','list="exroles"')+inp('name',o.name,'الاسم','class="w2"')};
 function row(o){const s=o.sn||{pre:'',m:'',post:''},one=t=>E(t).replace(/\n/g,' ↵ ');
  return`<div class="exr${o.on?'':' off'}" data-x="${o.id}"><input type="checkbox" data-xk="${o.id}" ${o.on?'checked':''} aria-label="اعتماد وتصدير"><div><div class="exf">${fields(o)}</div><div class="exs">${o.manual?'مُضاف يدوياً':one(s.pre)+'<mark>'+one(s.m)+'</mark>'+one(s.post)+' · '+E(o.pg)+' · ثقة '+Math.round(o.conf*100)+'%'+(o.amb?' · ⚠ تأكد من اليوم/الشهر':'')+(o.approx?' · <span class="exw">⚠ محوَّل من الهجري '+E(o.hijri)+' هـ (قد يختلف يوماً أو يومين) — تحقق</span>':'')+(o.conf<0.7?' · <span class="exw">⚠ راجع من الأصل</span>':'')+(o.n>1?' · تكرّر '+o.n+'×':'')}</div></div><button class="pb" data-act="exdel" data-id="${o.id}" aria-label="حذف الصف">🗑</button></div>`}
 function tbl(t,k){const nr=t.rows.length;
  return`<div class="exr${t.on?'':' off'}" data-t="${t.id}" style="grid-template-columns:auto 1fr"><input type="checkbox" data-xtk="${t.id}" ${t.on?'checked':''} aria-label="اعتماد الجدول"><div><div class="exh"><b>جدول ${k+1}</b><small>${E(t.pg)} · ${nr} صفاً × ${t.cols} أعمدة · اتساق ${Math.round(t.conf*100)}%${t.conf<0.8?' <span class="exw">⚠ راجع</span>':''}</small><button class="pb" data-act="excsvt" data-id="${t.id}" aria-label="CSV">CSV</button><button class="pb" data-act="exdelt" data-id="${t.id}" aria-label="حذف الجدول">🗑</button></div><div class="extb" dir="${t.rtl?'rtl':'ltr'}"><table>${t.rows.map((r,ri)=>`<tr>${r.map((c,ci)=>`<td><input data-xt="${t.id}" data-r="${ri}" data-c="${ci}" value="${E(c)}" ${ri==0?'style="font-weight:700"':''}></td>`).join('')}<td><button class="pb" data-act="extr" data-id="${t.id}" data-r="${ri}" aria-label="حذف الصف">✕</button></td></tr>`).join('')}</table></div></div></div>`}
 const ADD={date:'🗓 إضافة تاريخ',case:'⚖️ إضافة قضية',party:'👤 إضافة طرف',court:'🏛 إضافة محكمة',law:'📚 إضافة تشريع'};
 function render(){const res=XS.res,low=pagesNow().filter(it=>it._ocr.conf!=null&&it._ocr.conf<70).length;
  const TABS=[['date','🗓 التواريخ',cnt('date')],['case','⚖️ القضايا',cnt('case')],['party','👤 الأطراف',cnt('party')],['table','▦ الجداول',res.tables.length],['more','🏛 محاكم وتشريعات',cnt('court')+cnt('law')]];
  const body=XS.tab=='table'?(res.tables.length?res.tables.map(tbl).join(''):'<div class="shm">لم أجد جدولاً. الجداول تُستخرج من مواضع الكلمات بعد OCR مباشر (أعمدة واضحة، 3 صفوف فأكثر)، أو من نص يفصل أعمدته بـ | أو Tab.</div>')
   :XS.tab=='more'?['court','law'].map(t=>res.items.filter(o=>o.type==t).map(row).join('')+`<div class="acts one"><button class="btn" data-act="exadd" data-v="${t}">${ADD[t]}</button></div>`).join('')
   :(res.items.filter(o=>o.type==XS.tab).map(row).join('')||'<div class="shm">لم أجد شيئاً من هذا النوع في النص.</div>')+`<div class="acts one"><button class="btn" data-act="exadd" data-v="${XS.tab}">${ADD[XS.tab]}</button></div>`;
  sheet(`<div class="shh"><h2 class="sht">🧾 استخراج البيانات القانونية</h2><button class="lnk" data-act="ocrres">← النتائج</button></div>
<div class="shm">استخراج آلي <b>بالقواعد</b> (وليس بالذكاء الاصطناعي) من نص OCR على جهازك. ما يظهر <b>مقترح</b>: قد يخطئ أو يفوّت، فراجع كل صف على المستند الأصلي وصحّحه. المؤشَّر عليه فقط يُصدَّر. التواريخ الرقمية تُقرأ يوم/شهر/سنة.</div>${low?`<div class="wn">⚠ ${low} صفحة ثقة OCR فيها أقل من 70%؛ راجع الأرقام والأسماء بعناية.</div>`:''}
<div class="dkc">${TABS.map(t=>`<button class="chip ${XS.tab==t[0]?'on':''}" data-act="extab" data-v="${t[0]}">${t[1]} (${t[2]})</button>`).join('')}</div>
<datalist id="exroles">${ROLEL.map(r=>`<option value="${E(r)}">`).join('')}</datalist>${body}
<div class="shm mws">التصدير (المؤشَّر عليه فقط)</div><div class="acts"><button class="btn pri span2" data-act="exxlsx">📊 تصدير Excel (كل الأوراق)</button><button class="btn span2" data-act="excase">📅 اعتماد الجلسات والمواعيد في القضية</button><button class="btn" data-act="excopy">📋 نسخ ملخص</button><button class="btn" data-act="exrun">🔄 إعادة الاستخراج</button></div>
<div class="shm">لا يُكتب شيء في بيانات القضايا؛ انسخ الملخص أو صدّر Excel واعتمد ما تراجعه بنفسك.</div>`)}
 async function open(){if(!pagesNow().length){toast('لا يوجد نص بعد: شغّل التعرف على النص (OCR) أولاً',3500);act('ocropen');return}
  const sg=sigNow();let back=false;
  if(!XS.res||XS.sig!==sg){let r=null;if(XS.load){try{r=await XS.load(tsigNow())}catch(x){r=null}}
   if(r&&r.res&&Array.isArray(r.res.items)&&Array.isArray(r.res.tables)){XS.res=r.res;XS.tab=r.tab||XS.tab;XS.edited=true;back=true;
    XS.res.items.concat(XS.res.tables).forEach(o=>{const n=parseInt(String(o.id).replace(/\D/g,''),10);if(n>tid)tid=n})}
   else{XS.res=build();XS.edited=false}XS.sig=sg}
  render();if(back)toast('↩ استُعيدت مراجعتك المحفوظة لهذا المستند',2400)}
 const meta=()=>({name:(DP.name||'').trim()||dpBase(),caseName:(typeof HD!='undefined'&&HD.caseName)||'',client:(typeof HD!='undefined'&&HD.client)||'',ver:(typeof APP!='undefined'&&APP.version)||'',today:isoD(new Date())});
 const item=id=>XS.res&&XS.res.items.find(o=>o.id==id),tab=id=>XS.res&&XS.res.tables.find(t=>t.id==id);
 EX.ui={open,state:XS,render,tsig:tsigNow,sig:sigNow,meta,pages:pagesNow};
 document.addEventListener('input',e=>{const el=e.target;if(!XS.res||!el.dataset)return;
  if(el.dataset.xf){const r=el.closest('[data-x]'),o=r&&item(r.dataset.x);if(o){o[el.dataset.xf]=el.value;if(el.dataset.xf=='iso')o.approx=false;XS.edited=true}}
  else if(el.dataset.xt!=null){const t=tab(el.dataset.xt);if(t){t.rows[+el.dataset.r][+el.dataset.c]=el.value;XS.edited=true}}});
 document.addEventListener('change',e=>{const el=e.target;if(!XS.res||!el.dataset)return;
  if(el.dataset.xk){const o=item(el.dataset.xk);if(o){o.on=el.checked;XS.edited=true;el.closest('.exr').classList.toggle('off',!o.on)}}
  else if(el.dataset.xtk){const t=tab(el.dataset.xtk);if(t){t.on=el.checked;XS.edited=true;el.closest('.exr').classList.toggle('off',!t.on)}}
  else if(el.dataset.xf){const r=el.closest('[data-x]'),o=r&&item(r.dataset.x);if(o){o[el.dataset.xf]=el.value;if(el.dataset.xf=='iso')o.approx=false;XS.edited=true}}});
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;if(a.slice(0,2)!='ex'||a=='exec')return;
  try{
  if(a=='exopen')open();
  else if(a=='extab'){XS.tab=el.dataset.v;render()}
  else if(a=='exhij'){const o=item(el.dataset.id);if(o&&o.giso){if(!confirm('تحويل '+o.hijri+' هـ إلى '+o.giso+' ميلادياً بحساب تقريبي؟\nقد يختلف يوماً عن التقويم الرسمي، فراجعه قبل الاعتماد.'))return;o.iso=o.giso;o.approx=true;XS.edited=true;render()}}
  else if(a=='exrun'){if(XS.edited&&!confirm('إعادة الاستخراج تمحو تعديلاتك على هذه القوائم. متابعة؟'))return;XS.res=build();XS.sig=sigNow();XS.edited=false;render();toast('أُعيد الاستخراج من النص الحالي',1800)}
  else if(a=='exdel'){const i=XS.res.items.findIndex(o=>o.id==el.dataset.id);if(i>=0){XS.res.items.splice(i,1);XS.edited=true;render()}}
  else if(a=='exdelt'){const i=XS.res.tables.findIndex(t=>t.id==el.dataset.id);if(i>=0&&confirm('حذف هذا الجدول من القائمة؟')){XS.res.tables.splice(i,1);XS.edited=true;render()}}
  else if(a=='extr'){const t=tab(el.dataset.id);if(t&&t.rows.length>1){t.rows.splice(+el.dataset.r,1);XS.edited=true;render()}else toast('لا يمكن حذف آخر صف',1800)}
  else if(a=='exadd'){const t=el.dataset.v,o={type:t,id:'x'+(++tid)+'m',on:true,conf:1,manual:true,pg:'يدوي',pi:-1,s:0,e:0,n:1,sn:{pre:'',m:'',post:''},raw:''};
   if(t=='date')Object.assign(o,{iso:'',kind:'جلسة',time:''});else if(t=='case')Object.assign(o,{kind:'قضية',no:'',year:'',ctype:''});else if(t=='law')Object.assign(o,{kind:'قانون',no:'',year:''});else if(t=='court')o.name='';else Object.assign(o,{role:'غير محدد',name:''});
   XS.res.items.push(o);XS.edited=true;render()}
  else if(a=='exxlsx'){const S=EX.sheetsOf(XS.res,meta());if(S.length<2){toast('لا بيانات مؤشَّر عليها للتصدير',2500);return}
   dpSave({name:dpBase()+'-بيانات.xlsx',blob:new Blob([EX.xlsxBytes(S)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})})}
  else if(a=='excsvt'){const t=tab(el.dataset.id);if(t)dpSave({name:dpBase()+'-جدول'+(XS.res.tables.indexOf(t)+1)+'.csv',blob:new Blob([EX.csvText(t.rows)],{type:'text/csv;charset=utf-8'})})}
  else if(a=='excopy'){const t=EX.summaryText(XS.res,meta());if(!t){toast('لا بيانات مؤشَّر عليها',2200);return}try{await navigator.clipboard.writeText(t);toast('📋 نُسخ الملخص',1800)}catch(x){toast('تعذّر النسخ',2200)}}
  }catch(x){toast('تعذّرت العملية: '+String(x&&x.message||x).slice(0,80),4000)}});
})();
