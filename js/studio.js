/* الحسام سكان — المرحلة N4 (1.16.8): استوديو PDF على الجلسة.
   تعليق على الصفحة (نص، تمييز، تسطير، قلم، تعليق، أختام، توقيع)، إدارة الصفحات (تكرار، صفحة بيضاء، إدراج صور، تحديد وحذف واستخراج)، طباعة، وملف مشروع .hscan.
   إضافة فقط: لا يُعدَّل docprep.js. كل تعليق «عملية» filter باسم ann~… فوق صفحة الأصل (فيبقى الأصل محفوظاً ويعمل «تراجع»)، وتُنفَّذ عبر لفّ dpFilter.
   التعليقات تُدمج في بكسلات الصفحة عند التصدير (الصفحات صور) ولا تُنتج عناصر PDF قابلة للتحرير. التوقيع المرسوم يُخزَّن متجهاً داخل العملية؛ والمستورد من صورة يبقى في ذاكرة الجلسة ويُحفظ داخل ملف المشروع فقط.
   لا قاعدة بيانات ولا localStorage: ملف المشروع .hscan (ZIP) يُنزَّل على جهازك. */
const ST={tool:'text',col:'#c0392b',hcol:'#ffe14a',sz:1,txt:'',pend:[],i:-1,k:1,base:null,drag:null,img:{},sel:new Set(),sig:null,stamp:'copy',pad:null,n:0};
(function(){
 /* ---------------- رسم التعليقات (يُستعمل للمعاينة وللدمج النهائي) ---------------- */
 const isAr=t=>/[\u0600-\u06FF]/.test(t),FONT='"Tajawal","Segoe UI",Tahoma,Arial,sans-serif';
 ST.cols=[['#111111','أسود'],['#c0392b','أحمر'],['#1f4e9c','أزرق'],['#1e7b3a','أخضر']];
 ST.hcols=[['#ffe14a','أصفر'],['#7be07b','أخضر'],['#ff9ec7','وردي'],['#8fe3ff','سماوي']];
 ST.stamps=[['copy','صورة طبق الأصل'],['orig','أصل'],['recv','مستلم'],['secret','سري'],['urgent','عاجل'],['done','تم التنفيذ'],['rej','مرفوض'],['acc','مقبول'],['date','تاريخ اليوم'],['custom','نص مخصص']];
 const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'/'+p(d.getMonth()+1)+'/'+p(d.getDate())};
 const SZ={t:[0.02,0.03,0.046],p:[0.003,0.006,0.012],u:[0.003,0.005,0.008],s:[0.03,0.045,0.065],n:[0.22,0.3,0.4],g:[0.14,0.2,0.3]};
 function lines(x,tx,maxW){const out=[];for(const raw of String(tx).split('\n')){const ws=raw.split(/\s+/).filter(Boolean);if(!ws.length){out.push('');continue}let cur='';for(const w of ws){const t=cur?cur+' '+w:w;if(cur&&x.measureText(t).width>maxW){out.push(cur);cur=w}else cur=t}out.push(cur)}return out}
 function stroke(x,pts){if(!pts.length)return;x.beginPath();x.moveTo(pts[0][0],pts[0][1]);if(pts.length==1){x.lineTo(pts[0][0]+0.01,pts[0][1])}else{for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;x.quadraticCurveTo(pts[i][0],pts[i][1],mx,my)}const l=pts[pts.length-1];x.lineTo(l[0],l[1])}x.stroke()}
 function paint(x,list){for(const a of list){x.save();x.lineCap='round';x.lineJoin='round';
   if(a.k=='h'){x.globalCompositeOperation='multiply';x.fillStyle=a.c;x.fillRect(a.x,a.y,a.w,a.h)}
   else if(a.k=='u'){x.strokeStyle=a.c;x.lineWidth=a.w;x.beginPath();x.moveTo(a.x1,a.y1);x.lineTo(a.x2,a.y2);x.stroke()}
   else if(a.k=='p'){x.strokeStyle=a.c;x.lineWidth=a.w;stroke(x,a.pts)}
   else if(a.k=='t'){x.font=a.s+'px '+FONT;x.fillStyle=a.c;x.textAlign='center';x.textBaseline='middle';const L=String(a.tx).split('\n'),lh=a.s*1.35,y0=a.y-(L.length-1)*lh/2;L.forEach((l,i)=>{x.direction=isAr(l)?'rtl':'ltr';x.fillText(l,a.x,y0+i*lh)})}
   else if(a.k=='n'){x.font=a.s+'px '+FONT;const L=lines(x,a.tx,a.w-a.s*1.2),lh=a.s*1.4,h=L.length*lh+a.s*1.2,l=a.x-a.w/2,t=a.y-h/2;x.fillStyle='#fff3a0';x.strokeStyle='#b99a1b';x.lineWidth=Math.max(1.5,a.s*0.08);x.shadowColor='rgba(0,0,0,.25)';x.shadowBlur=a.s*0.4;x.fillRect(l,t,a.w,h);x.shadowBlur=0;x.strokeRect(l,t,a.w,h);
    x.fillStyle='#3a3000';x.textBaseline='middle';x.textAlign='center';L.forEach((s,i)=>{x.direction=isAr(s)?'rtl':'ltr';x.fillText(s,a.x,t+a.s*0.6+lh*(i+0.5))})}
   else if(a.k=='s'){x.translate(a.x,a.y);x.rotate((a.r||0)*Math.PI/180);x.font='bold '+a.s+'px '+FONT;x.textAlign='center';x.textBaseline='middle';x.direction=isAr(a.tx)?'rtl':'ltr';const w=x.measureText(a.tx).width,pad=a.s*0.45,bw=w+pad*2,bh=a.s*1.5,r=a.s*0.25;
    x.strokeStyle=x.fillStyle=a.c;x.lineWidth=Math.max(2,a.s*0.12);x.globalAlpha=0.85;x.beginPath();x.moveTo(-bw/2+r,-bh/2);x.arcTo(bw/2,-bh/2,bw/2,bh/2,r);x.arcTo(bw/2,bh/2,-bw/2,bh/2,r);x.arcTo(-bw/2,bh/2,-bw/2,-bh/2,r);x.arcTo(-bw/2,-bh/2,bw/2,-bh/2,r);x.closePath();x.stroke();x.fillText(a.tx,0,a.s*0.04)}
   else if(a.k=='g'){const w=a.w,h=w*a.a,l=a.x-w/2,t=a.y-h/2;if(a.i){const c=ST.img[a.i];if(c){x.globalCompositeOperation='multiply';x.drawImage(c,l,t,w,h)}}
    else if(a.v){x.strokeStyle=a.c;x.lineWidth=Math.max(1.6,w*0.014);const f=w/1000;a.v.forEach(s=>stroke(x,s.map(p=>[l+p[0]*f,t+p[1]*f])))}}
   x.restore()}}
 ST.paint=paint;
 const enc=l=>'ann~'+encodeURIComponent(JSON.stringify(l,(k,v)=>typeof v=='number'?Math.round(v*10)/10:v));ST.enc=enc;
 const _f=dpFilter;window.dpFilter=dpFilter=function(cv,f){if(typeof f=='string'&&f.startsWith('ann~')){try{paint(cv.getContext('2d'),JSON.parse(decodeURIComponent(f.slice(4))))}catch(e){}return}return _f(cv,f)};
 const q=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms)),chips=(a,cur,act,sw)=>a.map(([v,t])=>`<button class="chip ${String(cur)==String(v)?'on':''}" data-act="${act}" data-v="${v}" ${sw?`style="border-inline-start:14px solid ${v}"`:''}>${t}</button>`).join('');
 /* ---------------- شاشة الاستوديو ---------------- */
 function stOpenView(i){const it=DP.items[i];if(!it)return;ST.i=i;ST.pend=[];ST.drag=null;ST.base=dpRender(it);stShow()}
 const T_NAMES=[['text','✍️ نص'],['hl','🖍 تمييز'],['ul','➖ تسطير'],['pen','🖊 قلم'],['note','💬 تعليق'],['stamp','🔖 ختم'],['sig','✒️ توقيع']];
 function stOpts(){const t=ST.tool,sz=chips([[0,'صغير'],[1,'متوسط'],[2,'كبير']],ST.sz,'stsz'),col=chips(ST.cols,ST.col,'stcol',1);
  if(t=='text')return`<label class="fld"><span>النص (اكتبه ثم المس موضعه على الصفحة)</span><input data-st="txt" value="${esc2(ST.txt)}" placeholder="اكتب هنا"></label><div class="dkc">${col}</div><div class="dkc">${sz}</div>`;
  if(t=='note')return`<label class="fld"><span>نص التعليق (ثم المس الموضع)</span><input data-st="txt" value="${esc2(ST.txt)}" placeholder="ملاحظة"></label><div class="dkc">${sz}</div>`;
  if(t=='hl')return`<div class="shm">اسحب بإصبعك على النص المراد تمييزه؛ يبقى النص ظاهراً تحت اللون.</div><div class="dkc">${chips(ST.hcols,ST.hcol,'sthcol',1)}</div>`;
  if(t=='ul')return`<div class="shm">اسحب تحت السطر المراد تسطيره.</div><div class="dkc">${col}</div><div class="dkc">${sz}</div>`;
  if(t=='pen')return`<div class="shm">ارسم بإصبعك على الصفحة.</div><div class="dkc">${col}</div><div class="dkc">${sz}</div>`;
  if(t=='stamp')return`<div class="dkc">${chips(ST.stamps,ST.stamp,'ststamp')}</div>${ST.stamp=='custom'?`<label class="fld"><span>نص الختم</span><input data-st="txt" value="${esc2(ST.txt)}" placeholder="نص الختم"></label>`:''}<div class="dkc">${chips([['#c0392b','أحمر'],['#1f4e9c','أزرق'],['#1e7b3a','أخضر']],ST.col,'stcol',1)}</div><div class="dkc">${sz}</div><div class="shm">المس الصفحة لوضع الختم.</div>`;
  if(t=='sig')return`<div class="acts"><button class="btn" data-act="stsigpad">✒️ رسم توقيع</button><label class="btn">🖼 من صورة<input type="file" id="stsigf" accept="image/*" hidden></label></div><div class="shm">${ST.sig?'✔ التوقيع جاهز: المس الصفحة لوضعه (يمكنك تغيير حجمه ثم التراجع وإعادة الوضع).':'ارسم توقيعك أو اختر صورته من جهازك. لا يُخزَّن داخل التطبيق.'}</div><div class="dkc">${sz}</div>`;return''}
 function stShow(){const it=DP.items[ST.i],cv=ST.base,k=Math.min(Math.min(innerWidth-56,560)/cv.width,(innerHeight*0.4)/cv.height,1.5);ST.k=k;
  sheet(`<div class="shh"><h2 class="sht">🖋 استوديو التعليق</h2><button class="lnk" data-act="stcancel">إلغاء</button></div><div class="dpcv"><canvas id="stc" width="${Math.round(cv.width*k)}" height="${Math.round(cv.height*k)}"></canvas></div><div class="dkc">${T_NAMES.map(([v,t])=>`<button class="chip ${ST.tool==v?'on':''}" data-act="sttool" data-v="${v}">${t}</button>`).join('')}</div><div id="stopt">${stOpts()}</div><div class="acts" style="margin-top:8px"><button class="btn" data-act="stundo">↩ تراجع (<span id="stn">${ST.pend.length}</span>)</button><button class="btn pri" data-act="stdone">✅ تطبيق على الصفحة</button></div><div class="shm">التعليقات تُدمج في الصفحة عند التصدير. بعد التطبيق يمكنك التراجع عنها دفعة واحدة من المحرر.</div>`);
  const c=q('#stc');c.style.touchAction='none';let dn=null;
  c.onpointerdown=e=>{try{c.setPointerCapture(e.pointerId)}catch(x){}dn={p:stPt(e),moved:0};stStart(dn.p)};
  c.onpointermove=e=>{if(!dn)return;const p=stPt(e);if(Math.hypot(p.x-dn.p.x,p.y-dn.p.y)*ST.k>4)dn.moved=1;stMove(p)};
  c.onpointerup=e=>{if(!dn)return;const p=stPt(e),m=dn.moved;dn=null;stEnd(p,m)};c.onpointercancel=()=>{dn=null;ST.drag=null;stDraw()};stDraw()}
 const stPt=e=>{const c=q('#stc'),b=c.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*ST.base.width,y:(e.clientY-b.top)/b.height*ST.base.height}};
 const W=()=>ST.base.width;
 function stStart(p){const t=ST.tool;if(t=='hl'||t=='ul')ST.drag={k:t,a:p,b:p};else if(t=='pen')ST.drag={k:'pen',pts:[[p.x,p.y]]}}
 function stMove(p){const d=ST.drag;if(!d)return;if(d.k=='pen'){const l=d.pts[d.pts.length-1];if(Math.hypot(p.x-l[0],p.y-l[1])>W()*0.002)d.pts.push([p.x,p.y])}else d.b=p;stDraw()}
 function stEnd(p,moved){const t=ST.tool,w=W(),d=ST.drag;ST.drag=null;let a=null;
  if(t=='hl'&&d){const x=Math.min(d.a.x,p.x),y=Math.min(d.a.y,p.y),ww=Math.abs(p.x-d.a.x),hh=Math.abs(p.y-d.a.y);if(ww>w*0.01&&hh>w*0.004)a={k:'h',x,y,w:ww,h:hh,c:ST.hcol};else toast('اسحب على مساحة أكبر',1500)}
  else if(t=='ul'&&d){let y2=p.y;if(Math.abs(p.y-d.a.y)<Math.abs(p.x-d.a.x)*0.08)y2=d.a.y;if(Math.hypot(p.x-d.a.x,y2-d.a.y)>w*0.02)a={k:'u',x1:d.a.x,y1:d.a.y,x2:p.x,y2,c:ST.col,w:w*SZ.u[ST.sz]};else toast('اسحب خطاً أطول',1500)}
  else if(t=='pen'&&d){d.pts.push([p.x,p.y]);a={k:'p',pts:d.pts,c:ST.col,w:w*SZ.p[ST.sz]}}
  else if(t=='text'){if(!ST.txt.trim()){toast('اكتب النص أولاً',1500)}else a={k:'t',x:p.x,y:p.y,tx:ST.txt,c:ST.col,s:w*SZ.t[ST.sz]}}
  else if(t=='note'){if(!ST.txt.trim()){toast('اكتب نص التعليق أولاً',1500)}else a={k:'n',x:p.x,y:p.y,tx:ST.txt,s:w*0.024,w:w*SZ.n[ST.sz]}}
  else if(t=='stamp'){const tx=ST.stamp=='custom'?ST.txt.trim():ST.stamp=='date'?'بتاريخ '+today():ST.stamps.find(s=>s[0]==ST.stamp)[1];if(!tx)toast('اكتب نص الختم',1500);else a={k:'s',x:p.x,y:p.y,tx,c:ST.col=='#111111'?'#c0392b':ST.col,s:w*SZ.s[ST.sz],r:-10}}
  else if(t=='sig'){if(!ST.sig)toast('ارسم التوقيع أو اختر صورته أولاً',1800);else a=Object.assign({k:'g',x:p.x,y:p.y,w:w*SZ.g[ST.sz]},ST.sig)}
  if(a){ST.pend.push(a);const n=q('#stn');if(n)n.textContent=ST.pend.length}stDraw()}
 function stDraw(){const c=q('#stc');if(!c||!ST.base)return;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(ST.base,0,0,c.width,c.height);x.save();x.scale(ST.k,ST.k);const w=W(),l=ST.pend.slice(),d=ST.drag;
  if(d){if(d.k=='hl')l.push({k:'h',x:Math.min(d.a.x,d.b.x),y:Math.min(d.a.y,d.b.y),w:Math.abs(d.b.x-d.a.x),h:Math.abs(d.b.y-d.a.y),c:ST.hcol});else if(d.k=='ul')l.push({k:'u',x1:d.a.x,y1:d.a.y,x2:d.b.x,y2:d.b.y,c:ST.col,w:w*SZ.u[ST.sz]});else if(d.k=='pen')l.push({k:'p',pts:d.pts,c:ST.col,w:w*SZ.p[ST.sz]})}
  paint(x,l);x.restore()}
 /* ---------------- لوحة التوقيع ---------------- */
 function stSigPad(){const cw=Math.min(innerWidth-56,520),ch=Math.round(cw*0.45);ST.pad={s:[],cur:null,col:'#1f4e9c',cw,ch};
  sheet(`<div class="shh"><h2 class="sht">✒️ ارسم توقيعك</h2><button class="lnk" data-act="stsigback">رجوع ←</button></div><div class="dpcv"><canvas id="stsp" width="${cw}" height="${ch}" style="background:#fff;border:1px dashed #999"></canvas></div><div class="dkc">${chips([['#111111','أسود'],['#1f4e9c','أزرق']],ST.pad.col,'stsigcol',1)}</div><div class="acts"><button class="btn" data-act="stsigclr">🧹 مسح</button><button class="btn pri" data-act="stsigok">✔ استعمال</button></div><div class="shm">لا يُخزَّن التوقيع داخل التطبيق: يُرسم في كل مرة أو يُستورد من صورة على جهازك.</div>`);
  const c=q('#stsp');c.style.touchAction='none';const pp=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)/b.width*cw,(e.clientY-b.top)/b.height*ch]};
  c.onpointerdown=e=>{try{c.setPointerCapture(e.pointerId)}catch(x){}ST.pad.cur=[pp(e)];ST.pad.s.push(ST.pad.cur);padDraw()};c.onpointermove=e=>{if(ST.pad.cur){ST.pad.cur.push(pp(e));padDraw()}};c.onpointerup=c.onpointercancel=()=>{ST.pad.cur=null};padDraw()}
 function padDraw(){const c=q('#stsp'),P=ST.pad;if(!c||!P)return;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.strokeStyle=P.col;x.lineWidth=2.4;x.lineCap=x.lineJoin='round';P.s.forEach(s=>stroke(x,s))}
 function stSigUse(){const P=ST.pad,pts=P.s.flat();if(pts.length<3){toast('ارسم التوقيع أولاً',1500);return}
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),bw=Math.max(8,x1-x0),bh=Math.max(8,y1-y0),pd=bw*0.04,f=1000/(bw+2*pd);
  const v=P.s.map(s=>{const o=[];let l=null;s.forEach(p=>{const q=[Math.round((p[0]-x0+pd)*f),Math.round((p[1]-y0+pd)*f)];if(!l||Math.hypot(q[0]-l[0],q[1]-l[1])>=4||q===s[s.length-1]){o.push(q);l=q}});return o});
  ST.sig={v,a:(bh+2*pd)/(bw+2*pd),c:P.col};ST.tool='sig';ST.pad=null;stShow()}
 async function stSigImage(file){let b;try{b=await createImageBitmap(file)}catch(e){toast('تعذّرت قراءة الصورة',2500);return}
  const k=Math.min(1,700/Math.max(b.width,b.height)),c=dpCv(b.width*k,b.height*k),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0,c.width,c.height);if(b.close)b.close();
  const id=x.getImageData(0,0,c.width,c.height),d=id.data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){const p=(y*c.width+xx)*4;if(0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]<190){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(x1<=x0||y1<=y0){toast('لم أجد توقيعاً واضحاً في الصورة (استعمل توقيعاً داكناً على ورقة بيضاء)',3500);return}
  const pd=Math.round(Math.max(x1-x0,y1-y0)*0.03),cx=Math.max(0,x0-pd),cy=Math.max(0,y0-pd),cw=Math.min(c.width-cx,x1-x0+2*pd),ch=Math.min(c.height-cy,y1-y0+2*pd),o=dpCv(cw,ch);o.getContext('2d').drawImage(c,cx,cy,cw,ch,0,0,cw,ch);
  const sid='s'+Date.now().toString(36)+(++ST.n);ST.img[sid]=o;ST.sig={i:sid,a:ch/cw};ST.tool='sig';stShow();toast('✔ تم تحضير التوقيع — المس الصفحة لوضعه',2500)}
 /* ---------------- إدارة الصفحات ---------------- */
 const dupItem=it=>({id:++_dpid,name:it.name+' (نسخة)',orig:it.orig,ops:it.ops.map(o=>Object.assign({},o)),size:0,th:null});
 function blankItem(){const c=dpCv(1240,1754),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1240,1754);return{id:++_dpid,name:'صفحة بيضاء',orig:c,ops:[],size:0,th:null}}
 async function insertImages(i){return new Promise(res=>{const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;inp.style.display='none';document.body.appendChild(inp);
  inp.onchange=async()=>{const fl=[...inp.files];inp.remove();let at=i+1,bad=0;for(const f of fl){const it=await dpLoad(f);if(it){DP.items.splice(at++,0,it)}else bad++}if(bad)toast('تعذّرت قراءة '+bad+' ملف',3000);SC.saved=false;res(fl.length)};inp.addEventListener('cancel',()=>{inp.remove();res(0)});inp.click()})}
 function mountWork(){const sh=q('#sh');if(!sh||!DP.items.length||!sh.querySelector('[data-act="dprun"]'))return;
  [...sh.querySelectorAll('.dpt')].forEach((row,i)=>{const it=DP.items[i];if(!it)return;row.insertAdjacentHTML('afterbegin',`<input type="checkbox" class="stck" data-stsel="${it.id}" ${ST.sel.has(it.id)?'checked':''} aria-label="تحديد">`);
   const b=row.querySelector('.dpb');if(b)b.insertAdjacentHTML('beforeend',`<button class="pb" data-act="stann" data-i="${i}" aria-label="تعليق وتوقيع">🖋</button><button class="pb" data-act="stdup" data-i="${i}" aria-label="تكرار">⧉</button><button class="pb" data-act="stblank" data-i="${i}" aria-label="صفحة بيضاء بعدها">📄</button><button class="pb" data-act="stins" data-i="${i}" aria-label="إدراج صور بعدها">📥</button>`)});
  const h=sh.querySelector('.shh');if(h)h.insertAdjacentHTML('afterend',`<div class="dkc"><button class="chip" data-act="stselall">☑ تحديد الكل</button><button class="chip" data-act="stseldup">⧉ تكرار المحدد</button><button class="chip" data-act="stselexp">📤 استخراج المحدد</button><button class="chip" data-act="stseldel">🗑 حذف المحدد</button></div>`);
  sh.insertAdjacentHTML('beforeend',`<div class="shm mws">طباعة وملف المشروع</div><div class="acts"><button class="btn" data-act="stprint">🖨 طباعة</button><button class="btn" data-act="sthsave">💾 حفظ مشروع (.hscan)</button><label class="btn span2">📂 فتح ملف مشروع<input type="file" id="sthopen" accept=".hscan,application/zip,application/octet-stream" hidden></label></div><div class="shm">ملف المشروع يحفظ الصور الأصلية وكل التعديلات والتعليقات لتكمل لاحقاً (لا يُخزَّن شيء داخل التطبيق). الأصل يُحفظ بصيغة JPG جودة 95%.</div>`)}
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{mountWork()}catch(e){}return r}}
 {const _h=dpHome;window.dpHome=dpHome=function(){const r=_h.apply(this,arguments);try{const a=q('#sh .acts');if(a)a.insertAdjacentHTML('beforeend','<label class="btn">📂 فتح ملف مشروع<input type="file" id="sthopen" accept=".hscan,application/zip,application/octet-stream" hidden></label>')}catch(e){}return r}}
 {const _e=dpEditView;window.dpEditView=dpEditView=function(){const r=_e.apply(this,arguments);try{const sh=q('#sh');if(sh&&q('#dpe'))sh.insertAdjacentHTML('beforeend','<div class="shm mws">تعليق وتوقيع</div><div class="dkc"><button class="chip" data-act="stann" data-i="'+DPE.i+'">🖋 استوديو التعليق (نص، تمييز، قلم، ختم، توقيع)</button></div>')}catch(e){}return r}}
 /* ---------------- طباعة ---------------- */
 async function stPrint(){if(!DP.items.length)return;toast('⏳ تجهيز الطباعة…',2500);const N=DP.items.length,urls=[];for(let i=0;i<N;i++){await wait(15);urls.push(dpFinal(DP.items[i],i,N).toDataURL('image/jpeg',0.92))}
  const f=document.createElement('iframe');f.id='stprf';f.style.cssText='position:fixed;right:-9999px;bottom:0;width:10px;height:10px;border:0';document.body.appendChild(f);const d=f.contentDocument;d.open();
  d.write('<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:8mm}html,body{margin:0}img{display:block;width:100%;max-height:280mm;object-fit:contain;page-break-after:always}img:last-child{page-break-after:auto}</style>'+urls.map(u=>'<img src="'+u+'">').join(''));d.close();
  await Promise.all([...d.images].map(im=>im.complete?1:new Promise(r=>{im.onload=im.onerror=r})));
  try{f.contentWindow.focus();f.contentWindow.print()}catch(e){toast('تعذّرت الطباعة من هنا — صدّر PDF واطبعه',4000)}setTimeout(()=>f.remove(),90000)}
 /* ---------------- ملف المشروع .hscan (ZIP) ---------------- */
 const SET=['out','fmt','kb','maxd','page','wm','num','gray','name'];
 async function stSave(){if(!DP.items.length){toast('لا صفحات لحفظها');return}toast('⏳ جارٍ تجهيز ملف المشروع…',3000);await wait(40);
  const mk=(name,u)=>({name,method:0,time:0,date:0x21,crc:crc32(u),cs:u.length,us:u.length,raw:u}),ents=[],items=[],used=new Set(),TE=new TextEncoder();
  for(let i=0;i<DP.items.length;i++){const it=DP.items[i],b=await dpBlob(it.orig,'image/jpeg',0.95),u=new Uint8Array(await b.arrayBuffer()),fn='pages/p'+(i+1)+'.jpg';ents.push(mk(fn,u));
   const ops=JSON.parse(JSON.stringify(it.ops,(k,v)=>k[0]=='_'?undefined:v));items.push({name:it.name,img:fn,w:it.orig.width,h:it.orig.height,ops});
   ops.forEach(o=>{if(o.t=='filter'&&String(o.f).startsWith('ann~')){try{JSON.parse(decodeURIComponent(o.f.slice(4))).forEach(a=>{if(a.i)used.add(a.i)})}catch(e){}}})}
  const sigs=[];for(const id of used){const c=ST.img[id];if(!c)continue;const b=await dpBlob(c,'image/png'),fn='sigs/'+id+'.png';ents.push(mk(fn,new Uint8Array(await b.arrayBuffer())));sigs.push({id,file:fn})}
  const settings={};SET.forEach(k=>settings[k]=DP[k]);const man={app:'hscan',v:1,ver:(typeof APP!='undefined'&&APP.version)||'',created:new Date().toISOString(),settings,items,sigs};
  ents.unshift(mk('manifest.json',TE.encode(JSON.stringify(man))));const blob=new Blob([zipWrite(ents)],{type:'application/octet-stream'});
  dpSave({name:((DP.name||'').trim()||'مشروع-'+isoD(new Date()))+'.hscan',blob});return blob}
 const fromBlob=async(u8,type)=>{const b=await createImageBitmap(new Blob([u8],{type}));const c=dpCv(b.width,b.height),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0);if(b.close)b.close();return c};
 async function stLoad(file){try{const ents=zipRead(await file.arrayBuffer()),mf=ents.find(e=>e.name=='manifest.json');if(!mf)throw new Error('nomanifest');const man=JSON.parse(new TextDecoder().decode(await zipData(mf)));if(man.app!='hscan'||!Array.isArray(man.items))throw new Error('notproject');
   if(DP.items.length&&!SC.saved&&!confirm('فتح المشروع يستبدل الصفحات الحالية غير المحفوظة. متابعة؟'))return;
   const imgs={};for(const s of man.sigs||[]){const en=ents.find(e=>e.name==s.file);if(en)imgs[s.id]=await fromBlob(await zipData(en),'image/png')}
   const items=[];for(const m of man.items){const en=ents.find(e=>e.name==m.img);if(!en)throw new Error('missing '+m.img);items.push({id:++_dpid,name:m.name||'صفحة',orig:await fromBlob(await zipData(en),'image/jpeg'),ops:m.ops||[],size:0,th:null})}
   Object.assign(ST.img,imgs);DP.items=items;DP.res=null;Object.keys(man.settings||{}).forEach(k=>{if(SET.includes(k))DP[k]=man.settings[k]});SC.saved=true;ST.sel.clear();dpWork();toast('📂 فُتح المشروع: '+items.length+' صفحة',3000)}
  catch(e){toast('تعذّر فتح الملف — ليس ملف مشروع صالحاً',4000)}}
 ST.save=stSave;ST.load=stLoad;
 /* ---------------- الأحداث ---------------- */
 document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.st=='txt')ST.txt=el.value});
 document.addEventListener('change',async e=>{const el=e.target;
  if(el.id=='stsigf'){const f=el.files[0];el.value='';if(f)await stSigImage(f)}
  else if(el.id=='sthopen'){const f=el.files[0];el.value='';if(f)await stLoad(f)}
  else if(el.dataset&&el.dataset.stsel){const id=+el.dataset.stsel;el.checked?ST.sel.add(id):ST.sel.delete(id)}});
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,i=+el.dataset.i,v=el.dataset.v;
  if(a=='stann')stOpenView(i);
  else if(a=='sttool'){ST.tool=v;stShow()}
  else if(a=='stcol'){ST.col=v;stShow()}else if(a=='sthcol'){ST.hcol=v;stShow()}else if(a=='stsz'){ST.sz=+v;stShow()}else if(a=='ststamp'){ST.stamp=v;stShow()}
  else if(a=='stundo'){ST.pend.pop();stShow()}
  else if(a=='stdone'){const it=DP.items[ST.i];if(it&&ST.pend.length){dpOp(it,{t:'filter',f:enc(ST.pend)});SC.saved=false}const n=ST.pend.length,k=ST.i;ST.pend=[];ST.drag=null;dpEdit(k);if(n)toast('✔ طُبّق '+n+' تعليق على الصفحة',2500)}
  else if(a=='stcancel'){const k=ST.i;ST.pend=[];ST.drag=null;dpEdit(k)}
  else if(a=='stsigpad')stSigPad();
  else if(a=='stsigcol'){ST.pad.col=v;document.querySelectorAll('[data-act="stsigcol"]').forEach(b=>b.classList.toggle('on',b.dataset.v==v));padDraw()}
  else if(a=='stsigclr'){ST.pad.s=[];padDraw()}
  else if(a=='stsigok')stSigUse();
  else if(a=='stsigback')stShow();
  else if(a=='stdup'){const it=DP.items[i];if(it){DP.items.splice(i+1,0,dupItem(it));SC.saved=false;dpWork()}}
  else if(a=='stblank'){DP.items.splice(i+1,0,blankItem());SC.saved=false;dpWork()}
  else if(a=='stins'){if(await insertImages(i))dpWork()}
  else if(a=='stselall'){const all=DP.items.every(x=>ST.sel.has(x.id));DP.items.forEach(x=>all?ST.sel.delete(x.id):ST.sel.add(x.id));dpWork()}
  else if(a=='stseldup'){const out=[];DP.items.forEach(x=>{out.push(x);if(ST.sel.has(x.id))out.push(dupItem(x))});if(out.length==DP.items.length){toast('حدّد صفحات أولاً');return}DP.items=out;SC.saved=false;ST.sel.clear();dpWork()}
  else if(a=='stseldel'){const n=DP.items.filter(x=>ST.sel.has(x.id)).length;if(!n){toast('حدّد صفحات أولاً');return}if(!confirm('حذف '+n+' صفحة؟'))return;DP.items=DP.items.filter(x=>!ST.sel.has(x.id));ST.sel.clear();SC.saved=false;dpWork()}
  else if(a=='stselexp'){const all=DP.items,sel=all.filter(x=>ST.sel.has(x.id));if(!sel.length){toast('حدّد صفحات أولاً');return}const nm=DP.name;DP.name=((nm||'').trim()||'مستندات-'+isoD(new Date()))+'-مستخرج';DP.items=sel;try{await dpRun()}finally{DP.items=all;DP.name=nm}}
  else if(a=='stprint')stPrint();
  else if(a=='sthsave')stSave()});
})();
