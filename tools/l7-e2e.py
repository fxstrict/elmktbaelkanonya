"""L7 (1.29.0): حقوق النشر وإزالة المحتوى في المتصفح. الاستعمال: python3 tools/l7-e2e.py <مجلد المشروع>"""
import sys,threading,http.server,functools,asyncio,json
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else '.'
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);H.log_message=lambda *a:None
s=http.server.ThreadingHTTPServer(('127.0.0.1',8797),H);threading.Thread(target=s.serve_forever,daemon=True).start()
F=[];ok=0
def chk(n,c,x=None):
  global ok
  if c: ok+=1;print('✓',n)
  else: F.append(n);print("✗",n,str(x)[:200] if x is not None else "")
U='http://127.0.0.1:8797/index.html'
async def main():
  async with async_playwright() as pw:
    try: b=await pw.chromium.launch()
    except Exception: b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append(str(e)))
    await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    state={'mode':'empty'}   # empty | ids | fail
    async def tk(r):
      if state['mode']=='fail': await r.abort()
      else: await r.fulfill(status=200,content_type='application/json',body=json.dumps({'ids':state.get('ids',[]) if state['mode']=='ids' else []}))
    await p.route('**/data/takedown.json*',tk)
    async def boot(wait=2600):
      await p.goto(U);await p.wait_for_timeout(wait);await p.evaluate("closeSheet()")
    await boot()
    # 1) أساس: لا كتابة tkd عند قائمة فارغة، والقوائم سليمة
    chk('no tkd key written for empty list',await p.evaluate("localStorage.getItem('tkd')")is None)
    chk('RT loaded + hidden empty',await p.evaluate("typeof RT=='object' && RTX.hidden.length==0"))
    pick=await p.evaluate("""()=>{const d=DATA.find(x=>x[2]=='d'),b=DATA.find(x=>x[2]=='b'),v=DATA.find(x=>PARTS[x[0]]);return{d:d[0],dt:d[1],b:b[0],bt:b[1],v:v[0],vt:v[1],n:DATA.length}}""")
    # 2) واجهة الصيغة العادية: زر الطلب برسالة جاهزة ولا ملاحظة مؤلف
    await p.evaluate(f"itemSheet('{pick['d']}')");await p.wait_for_timeout(200)
    chk('item sheet has removal button',await p.locator('#sh .rtb a').count()==1)
    href=await p.get_attribute('#sh .rtb a','href')
    from urllib.parse import unquote
    chk('button link carries title+id',pick['dt'][:15] in unquote(href) and pick['d'] in unquote(href) and href.startswith('https://wa.me/'))
    chk('no author note on a formula',await p.locator('#sh .rtn').count()==0)
    # 3) كتاب وموسوعة: ملاحظة المؤلف
    await p.evaluate(f"itemSheet('{pick['b']}')");await p.wait_for_timeout(200)
    chk('book shows author note + button',await p.locator('#sh .rtn').count()==1 and await p.locator('#sh .rtb a').count()==1)
    await p.evaluate(f"itemSheet('{pick['v']}')");await p.wait_for_timeout(200)
    chk('encyclopedia sheet still renders parts',await p.locator('#sh .pr').count()>0)
    # 4) شاشة التواصل ← الإشعار
    await p.evaluate("contactSheet()");await p.wait_for_timeout(200)
    chk('contact sheet has rights button',await p.locator('#sh [data-act=rtnotice]').count()==1)
    await p.click('#sh [data-act=rtnotice]');await p.wait_for_timeout(250)
    txt=await p.inner_text('#sh')
    chk('notice sheet content',('حقوق النشر' in txt) and ('إزالة' in txt) and await p.locator('#sh a[href^="mailto:"]').count()==1 and await p.locator('#sh a[href^="https://wa.me/"]').count()==1)
    await p.evaluate("closeSheet()")
    # 5) إخفاء: قائمة بثلاثة معرّفات (صيغة، كتاب، موسوعة) + مفضلة تشير لأحدها
    state.update(mode='ids',ids=[pick['d'],pick['b'],pick['v']])
    await p.evaluate(f"FAV.push('{pick['d']}');localStorage.setItem('fav',JSON.stringify(FAV))")
    await boot(3200)
    chk('tkd stored after refresh',await p.evaluate("JSON.parse(localStorage.getItem('tkd')).length")==3)
    chk('first run after change = pending (not applied yet)',await p.evaluate("RTX.pending===true && !!byId['%s']"%pick['d']))
    await boot(3200)
    r=await p.evaluate("""p=>({d:!!byId[p.d],b:!!byId[p.b],v:!!byId[p.v],pv:!!PARTS[p.v],n:DATA.length,q:ALT&&1,pend:RTX.pending,hid:RTX.hidden.length})""",pick)
    chk('after reopen: 3 hidden from byId/PARTS',not r['d'] and not r['b'] and not r['v'] and not r['pv'] and r['hid']==3 and r['n']==pick['n']-3 and not r['pend'],r)
    await p.evaluate("S.tab='all';render()");await p.wait_for_timeout(300)
    chk('hidden item not in rendered list',await p.locator(f'.row[data-id="{pick["d"]}"]').count()==0)
    await p.evaluate("S.tab='fav';S.cl=null;render()");await p.wait_for_timeout(300)
    chk('favourite pointing at hidden item does not crash',len(E)==0,E)
    # 6) بلا إنترنت: القائمة المحفوظة تبقى مطبَّقة
    state['mode']='fail';await boot(3000)
    chk('offline: still hidden from cached list',await p.evaluate("!byId['%s'] && RTX.hidden.length==3"%pick['d']))
    chk('offline: tkd untouched',await p.evaluate("JSON.parse(localStorage.getItem('tkd')).length")==3)
    # 7) النسخ الاحتياطي لا يحمل tkd
    chk('backup excludes tkd',await p.evaluate("!('tkd' in bkLocal())"))
    # 8) رفع الإزالة: قائمة فارغة ← يُحفظ [] ثم تعود العناصر بعد إعادة الفتح
    state['mode']='empty';await boot(3200);await boot(2600)
    chk('restored after list emptied',await p.evaluate("!!byId['%s'] && !!byId['%s'] && !!PARTS['%s'] && DATA.length==%d"%(pick['d'],pick['b'],pick['v'],pick['n'])))
    # 9) JSON فاسد من الشبكة لا يكسر ولا يكتب
    await p.evaluate("localStorage.removeItem('tkd')")
    await p.route('**/data/takedown.json*',lambda r:r.fulfill(status=200,content_type='application/json',body='{bad'))
    await boot(2800);chk('corrupt json ignored, nothing written',await p.evaluate("localStorage.getItem('tkd')")is None)
    await p.route('**/data/takedown.json*',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ids":["short","<script>"]}'))
    await boot(2800);chk('invalid ids ignored',await p.evaluate("localStorage.getItem('tkd')")is None and await p.evaluate("DATA.length")==pick['n'])
    chk('no JS errors',len(E)==0,E)
    await b.close()
asyncio.run(main())
print(f'\n{ok} نجح، {len(F)} فشل')
sys.exit(1 if F else 0)
