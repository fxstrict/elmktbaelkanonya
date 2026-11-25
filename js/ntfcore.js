/* نواة التنبيهات (L1): دوال نقية بلا اعتماد على الصفحة، تُحمَّل في الصفحة وفي عامل الخدمة معاً فيتطابق السلوك.
   العنصر: {id,k:'s'|'d'|'p',title,cn,date:'YYYY-MM-DD',time:'HH:MM'?}  s=جلسة d=ميعاد p=توكيل */
(function(g){
const p2=n=>String(n).padStart(2,'0'),ICON={s:'🗓',d:'⏰',p:'📜'};
const iso=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const dayDiff=(a,b)=>{const A=a.split('-'),B=b.split('-');return Math.round((Date.UTC(+B[0],+B[1]-1,+B[2])-Date.UTC(+A[0],+A[1]-1,+A[2]))/864e5)};
const when=n=>n<0?'فاتت منذ '+(-n)+' يوم':n==0?'اليوم':n==1?'غداً':n==2?'بعد يومين':'بعد '+n+' أيام';
const ok=x=>x&&x.date&&/^\d{4}-\d{2}-\d{2}$/.test(x.date);
/* ما يستحق التنبيه: من اليوم حتى lead يوماً (+ الجلسات الفائتة غير المغلقة تُحسب في الشارة فقط) */
function due(items,today,lead){return(items||[]).filter(ok).map(x=>Object.assign({},x,{n:dayDiff(today,x.date)})).filter(x=>x.n>=0&&x.n<=(lead|0)).sort((a,b)=>a.n-b.n||((a.time||'')<(b.time||'')?-1:1))}
function overdue(items,today){return(items||[]).filter(ok).filter(x=>x.k=='s'&&dayDiff(today,x.date)<0)}
/* عدد الشارة: كل ما موعده اليوم أو غداً + الجلسات الفائتة */
function badge(items,today){return(items||[]).filter(ok).filter(x=>{const n=dayDiff(today,x.date);return n>=0&&n<=1||(x.k=='s'&&n<0)}).length}
/* تجاهل ما نُبِّه عنه اليوم: الحالة {day,ids[]} */
function fresh(list,st,today){const seen=st&&st.day==today?st.ids||[]:[];return list.filter(x=>!seen.includes(x.k+x.id+x.date))}
function mark(st,list,today){const base=st&&st.day==today?st.ids||[]:[];return{day:today,ids:base.concat(list.map(x=>x.k+x.id+x.date))}}
function msg(list,over){const one=list.length==1,body=list.slice(0,4).map(x=>(ICON[x.k]||'•')+' '+x.title+(x.cn?' — '+x.cn:'')+' · '+when(x.n)+(x.time?' '+x.time:'')).join('\n')+(list.length>4?'\n+'+(list.length-4)+' أخرى':'')+(over?'\n⚠️ '+over+' جلسة فاتت لم تُغلق':'');
 return{title:'⚖️ '+(one?list[0].title:list.length+' تنبيهات قانونية'),body,tag:'ntf-'+(list[0]?list[0].date:'x')}}
/* ---- ICS: ملف واحد لكل المواعيد، UID ثابت فتحديثه لا يكرر الأحداث، وتنبيهات تعمل من تقويم الجهاز بلا إنترنت ---- */
const esc=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
function fold(line){const enc=new TextEncoder(),out=[];let cur='',b=0,lim=75;for(const ch of line){const l=enc.encode(ch).length;if(b+l>lim){out.push(cur);cur=' '+ch;b=1+l;lim=75}else{cur+=ch;b+=l}}out.push(cur);return out.join('\r\n')}
const dt=(d,t)=>d.replace(/-/g,'')+(t?'T'+t.replace(':','')+'00':'');
function ics(items,o){o=o||{};const lead=o.lead==null?1:o.lead|0,now=(o.now||new Date()).toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//legal-library//ntf//AR','CALSCALE:GREGORIAN','X-WR-CALNAME:المكتبة القانونية — المواعيد','X-WR-TIMEZONE:Africa/Cairo'];
 (items||[]).filter(ok).forEach(x=>{const timed=/^\d{2}:\d{2}$/.test(x.time||''),title=(ICON[x.k]||'')+' '+x.title+(x.cn?' — '+x.cn:'');
  L.push('BEGIN:VEVENT','UID:'+x.k+'-'+x.id+'@legal-library','DTSTAMP:'+now,'SUMMARY:'+esc(title));
  if(timed){const[h,m]=x.time.split(':').map(Number),e=new Date(2000,0,1,h+1,m);L.push('DTSTART:'+dt(x.date,x.time),'DTEND:'+dt(x.date,p2(e.getHours())+':'+p2(e.getMinutes())))}
  else{const e=new Date(+x.date.slice(0,4),+x.date.slice(5,7)-1,+x.date.slice(8,10)+1);L.push('DTSTART;VALUE=DATE:'+x.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+iso(e).replace(/-/g,''))}
  const al=[];if(timed){al.push('-P1D','-PT2H')}else{al.push('PT8H','-PT15H');if(lead>=2)al.push('-PT'+(lead*24-9)+'H')}
  al.forEach(t=>L.push('BEGIN:VALARM','TRIGGER:'+t,'ACTION:DISPLAY','DESCRIPTION:'+esc(title),'END:VALARM'));L.push('END:VEVENT')});
 L.push('END:VCALENDAR');return L.map(fold).join('\r\n')+'\r\n'}
g.NTFC={iso,dayDiff,when,due,overdue,badge,fresh,mark,msg,ics};
})(typeof self!=='undefined'?self:this);
