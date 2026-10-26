/* تعبئة ملفات Word (docx) داخل المتصفح بدون مكتبات: قراءة/كتابة zip + اكتشاف الفراغات المنقّطة وتصنيفها.
   الفراغ = سلسلة نقاط (...) أو ما يشبهها؛ والتاريخ ../../.. والوقت ..:.. يُعاملان كحقل واحد. */
const _T=new TextEncoder(),_D=new TextDecoder();
let _crcT;
function crc32(u){if(!_crcT){_crcT=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;_crcT[n]=c>>>0}}
 let c=~0;for(let i=0;i<u.length;i++)c=_crcT[(c^u[i])&255]^(c>>>8);return(~c)>>>0}
async function inflateRaw(u){const s=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer())}
function zipRead(buf){const u=new Uint8Array(buf),v=new DataView(u.buffer,u.byteOffset,u.byteLength);let e=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(v.getUint32(i,true)==0x06054b50){e=i;break}
 if(e<0)throw new Error('notzip');
 const n=v.getUint16(e+10,true);let o=v.getUint32(e+16,true);const ents=[];
 for(let i=0;i<n;i++){if(v.getUint32(o,true)!=0x02014b50)throw new Error('badzip');
  const method=v.getUint16(o+10,true),time=v.getUint16(o+12,true),date=v.getUint16(o+14,true),crc=v.getUint32(o+16,true),cs=v.getUint32(o+20,true),us=v.getUint32(o+24,true),nl=v.getUint16(o+28,true),el=v.getUint16(o+30,true),cl=v.getUint16(o+32,true),lo=v.getUint32(o+42,true);
  const name=_D.decode(u.subarray(o+46,o+46+nl)),ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true);
  ents.push({name,method,time,date,crc,cs,us,raw:u.subarray(ds,ds+cs)});o+=46+nl+el+cl}
 return ents}
const zipData=en=>en.method==0?Promise.resolve(en.raw):inflateRaw(en.raw);
function zipWrite(ents){const parts=[],cd=[];let off=0,cdl=0;
 for(const e of ents){const nb=_T.encode(e.name),h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,e.method,true);h.setUint16(10,e.time,true);h.setUint16(12,e.date,true);h.setUint32(14,e.crc,true);h.setUint32(18,e.cs,true);h.setUint32(22,e.us,true);h.setUint16(26,nb.length,true);
  parts.push(new Uint8Array(h.buffer),nb,e.raw);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,e.method,true);c.setUint16(12,e.time,true);c.setUint16(14,e.date,true);c.setUint32(16,e.crc,true);c.setUint32(20,e.cs,true);c.setUint32(24,e.us,true);c.setUint16(28,nb.length,true);c.setUint32(42,off,true);
  cd.push(new Uint8Array(c.buffer),nb);cdl+=46+nb.length;off+=30+nb.length+e.raw.length}
 const t=new DataView(new ArrayBuffer(22));t.setUint32(0,0x06054b50,true);t.setUint16(8,ents.length,true);t.setUint16(10,ents.length,true);t.setUint32(12,cdl,true);t.setUint32(16,off,true);
 const all=[...parts,...cd,new Uint8Array(t.buffer)],out=new Uint8Array(all.reduce((a,x)=>a+x.length,0));let p=0;all.forEach(x=>{out.set(x,p);p+=x.length});return out}
/* ---- الفراغات ---- */
const TRE=/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g,PRE=/<w:p[\s>][\s\S]*?<\/w:p>/g;
const xesc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const xun=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const BL='[.…·_]';
const BRE=()=>new RegExp(`(${BL}{2,}\\s*\\/\\s*${BL}{2,}\\s*\\/\\s*${BL}{2,})|(${BL}{2,}\\s*:\\s*${BL}{2,})|(${BL}{3,})`,'g');
function kindOf(c,type,st){
 if(type=='date')return'date';if(type=='time')return'time';
 const t=c.slice(-34);let m;
 if(/يوم\s*$/.test(t))return'dayname';
 if(/محضر\s*(?:محكمه)?\s*$/.test(t)&&/محضر/.test(t.slice(-12)))return/محكمه\s*$/.test(t)?'court':'bailiff';
 if(/(?:^|\s)انا\s*$/.test(t))return'bailiff';
 if(/(?:الاستاذ|المحامي|المحاميه)\s*\/?\s*$/.test(t))return'lawyer';
 if(/(?:الكاين|كاين)\s*$/.test(t)&&/مكتب/.test(c.slice(-90)))return'office';
 if(/(?:السيده|المعلن\s*اليها|المنذر\s*اليها|المدعي\s*عليها|المطلقه|الزوجه)\s*\/?\s*$/.test(t)){st.last='B';return'B'}
 if(/(?:السيد|المعلن\s*اليه|المنذر\s*اليه|المدعي\s*عليه|المستانف\s*ضده|الاستاذ)\s*\/?\s*$/.test(t)){
  const b=/(?:المعلن\s*اليه|المنذر\s*اليه|المدعي\s*عليه|ضد|المستانف\s*ضده)\s*(?:السيد)?\s*\/?\s*$/.test(t)||(st.seenA&&!/طلب\s*السيد/.test(t));
  if(b){st.last='B';return'B'}st.seenA=true;st.last='A';return'A'}
 if(/(?:المقيم[هة]?|ومقيم|والمقيم[هة]?)\s*(?:طرف|ب)?\s*\/?\s*$/.test(t)||/محل\s*اقامته?\s*$/.test(t))return st.last+'_addr';
 if(/الدايره\s*$/.test(t))return'circuit';
 if(/محكمه\s*$/.test(t))return'court';
 if(/رقم\s*(?:الدعوي|القضيه|الطعن|الاستيناف)?\s*$/.test(t))return'caseno';
 return'misc'}
/* يمشي على كل فقرة؛ cb(info) يعيد نص الاستبدال أو null لترك الفراغ كما هو */
function walkDoc(xml,cb){let idx=0;const st={seenA:false,last:'A',tail:''};
 return xml.replace(PRE,p=>{const nodes=[];p.replace(TRE,(m,a,t)=>{nodes.push(xun(t));return m});
  const full=nodes.join(''),re=BRE(),bl=[];let m;while((m=re.exec(full)))bl.push({s:m.index,e:m.index+m[0].length,type:m[1]?'date':m[2]?'time':'text'});
  const tail=st.tail;st.tail=full.slice(-70);if(!bl.length)return p;
  const chars=nodes.map(t=>t.split('')),starts=[];let acc=0;nodes.forEach(t=>{starts.push(acc);acc+=t.length});
  const at=pos=>{let i=starts.length-1;while(i>0&&starts[i]>pos)i--;return[i,pos-starts[i]]};let changed=false;
  bl.forEach(b=>{const raw=(tail+' '+full.slice(0,b.s)).replace(/[.…·_]{2,}/g,' ').replace(/\s+/g,' ').trim(),
   info={idx:idx++,type:b.type,kind:kindOf(nz(raw),b.type,st),label:raw.slice(-32),orig:full.slice(b.s,b.e)},r=cb(info);
   if(r==null||r==='')return;changed=true;const W=/[\u0600-\u06FFA-Za-z0-9]/,pv=full[b.s-1],nx=full[b.e];const r2=(pv&&W.test(pv)?' ':'')+r+(nx&&W.test(nx)&&!(b.type=='date'&&nx=='م')?' ':'');const[i0,j0]=at(b.s);chars[i0][j0]=r2;for(let q=b.s+1;q<b.e;q++){const[i,j]=at(q);chars[i][j]=''}});
  if(!changed)return p;let k=0;
  return p.replace(TRE,(m0,a)=>`<w:t xml:space="preserve"${(a||'').replace(/\sxml:space="[^"]*"/,'')}>${xesc(chars[k++].join(''))}</w:t>`)})}
async function docxScan(buf){const ents=zipRead(buf),de=ents.find(e=>e.name=='word/document.xml');if(!de)throw new Error('notdocx');
 const xml=_D.decode(await zipData(de)),blanks=[];walkDoc(xml,i=>{blanks.push(i);return null});return{ents,xml,blanks}}
async function docxFill(sc,vals){const xml=walkDoc(sc.xml,i=>vals[i.idx]||null),b=_T.encode(xml);
 return zipWrite(sc.ents.map(e=>e.name=='word/document.xml'?{...e,method:0,crc:crc32(b),cs:b.length,us:b.length,raw:b}:e))}

/* نص الوثيقة فقط (لمعاينة الملف داخل البرنامج) */
async function docxText(u8){const ents=zipRead(u8),de=ents.find(e=>e.name=='word/document.xml'),xml=_D.decode(await zipData(de));
 return(xml.match(PRE)||[]).map(p=>{let t='';p.replace(TRE,(m,a,x)=>{t+=xun(x);return m});return t}).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
