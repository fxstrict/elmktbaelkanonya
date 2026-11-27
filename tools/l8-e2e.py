"""L8 (1.30.0): تقوية الترخيص في المتصفح. الاستعمال: python3 tools/l8-e2e.py <مجلد المشروع>"""
import sys,threading,http.server,functools,asyncio
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else '.'
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);H.log_message=lambda *a:None
s=http.server.ThreadingHTTPServer(('127.0.0.1',8799),H);threading.Thread(target=s.serve_forever,daemon=True).start()
F=[];ok=0
def chk(n,c,x=None):
  global ok
  if c: ok+=1;print('✓',n)
  else: F.append(n);print('✗',n,str(x)[:200] if x is not None else '')
U='http://127.0.0.1:8799/index.html'
MINT="""async days=>{const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const raw=new Uint8Array(await crypto.subtle.exportKey('raw',kp.publicKey));let s='';raw.forEach(b=>s+=String.fromCharCode(b));PRO.pub=btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');_proKey=null;
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',b32=u=>{let bits=0,v=0,o='';for(const x of u){v=(v<<8)|x;bits+=8;while(bits>=5){bits-=5;o+=A[(v>>bits)&31];v&=(1<<bits)-1}}if(bits)o+=A[(v<<(5-bits))&31];return o};
const lb=new TextEncoder().encode('اختبار'),p=new Uint8Array(8+lb.length),dv=new DataView(p.buffer);p[0]=1;p[1]=1;dv.setUint16(2,proToday()+days);dv.setUint32(4,777);p.set(lb,8);
const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,p));return 'LL1.'+b32(p)+'.'+b32(sig)}"""
async def main():
  async with async_playwright() as pw:
    try: b=await pw.chromium.launch()
    except Exception: b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append(str(e)))
    await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    async def boot(w=2800):
      await p.goto(U);await p.wait_for_timeout(w);await p.evaluate("closeSheet()")
    await boot()
    # 1) التجربة + نسخة الكاش
    await p.evaluate("proStartTrial()");await p.wait_for_timeout(300)
    t0=await p.evaluate("localStorage.getItem('trial0')");chk('trial started',t0 is not None)
    await p.evaluate("proMirror()");await p.wait_for_timeout(200)
    chk('mirror in Cache API',await p.evaluate("caches.open('pro-st').then(c=>c.match('pro-st.json')).then(r=>r&&r.json()).then(j=>!!j&&j.t0==%s)"%t0))
    await p.evaluate("localStorage.clear()")
    await boot(3200)
    chk('trial restored after localStorage.clear',await p.evaluate("localStorage.getItem('trial0')")==t0)
    chk('still trial (not reset to new)',await p.evaluate("proStatus().state")=='trial',await p.evaluate("[proStatus(),localStorage.getItem('trial0'),PRO.enabled]"))
    chk('lhw written (monotonic mark)',await p.evaluate("+localStorage.getItem('lhw')>0"))
    # 2) ساعة متأخرة: lhw في المستقبل + كود صالح
    code=await p.evaluate(MINT,100)
    chk('activate minted code',(await p.evaluate("async c=>{const r=await proActivate(c);await proInit();return r}",code))['ok'])
    await p.evaluate("localStorage.setItem('lhw',JSON.stringify(Date.now()+10*864e5));_proHw=0;localStorage.removeItem('rnwd')")
    st=await p.evaluate("proStatus()")
    chk('clockBack flagged and days not extended',st['clockBack'] is True and st['daysLeft']<=90,st)
    await p.evaluate("go('home')");await p.wait_for_timeout(400)
    txt=await p.evaluate("(document.querySelector('.rnw')||{}).textContent||''")
    chk('home banner for clock',('ساعة جهازك' in txt) and await p.locator('.rnw [data-act=prorenew]').count()==0,txt)
    # 3) قِدم التحقق
    await p.evaluate("localStorage.setItem('lhw',JSON.stringify(Date.now()));_proHw=0;localStorage.setItem('rvt',JSON.stringify(Date.now()-60*864e5));localStorage.removeItem('rnwd')")
    st=await p.evaluate("proStatus()");chk('stale flagged, still pro',st['stale'] is True and st['state']=='pro' and not st['clockBack'],st)
    await p.evaluate("render()");await p.wait_for_timeout(400)
    txt=await p.evaluate("(document.querySelector('.rnw')||{}).textContent||''")
    chk('home banner for stale',('الإنترنت' in txt),txt)
    await p.click('.rnw .rx');await p.wait_for_timeout(200)
    chk('banner dismissible',await p.locator('.rnw').count()==0)
    # 4) لا مفاتيح محظورة في النسخة الاحتياطية
    bk=await p.evaluate("Object.keys(bkLocal())")
    chk('backup has no lhw/rvt',not any(k in bk for k in ('lhw','rvt')),bk)
    chk('no JS errors',len(E)==0,E)
    await b.close()
asyncio.run(main())
print(f'\n{ok} نجح، {len(F)} فشل')
sys.exit(1 if F else 0)
