import json,subprocess,threading,http.server,functools,re,hashlib,asyncio
from playwright.async_api import async_playwright
exec(open('/tmp/w/off.py').read().split("K=json.loads")[0].split("import asyncio")[0]) if False else None
js=open('/tmp/w/off.py').read().split("js=r'''")[1].split("'''")[0]
K=json.loads(subprocess.check_output(['node','-e',js]))
c=open('/tmp/w/tc3/js/config.js',encoding='utf8').read();c=re.sub(r"pub:'[^']*'","pub:'%s'"%K['pub'],c);open('/tmp/w/tc3/js/config.js','w',encoding='utf8').write(c)
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory='/tmp/w/tc3');H.log_message=lambda *a:None
s=http.server.ThreadingHTTPServer(('127.0.0.1',8769),H);threading.Thread(target=s.serve_forever,daemon=True).start()
U='http://127.0.0.1:8769/index.html';R=[]
def T(n,c):R.append(c);print(('✓ ' if c else '✗ ')+n)
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block');p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append(str(e)));await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    txt=lambda:p.evaluate("document.body.innerText")
    await p.goto(U);await p.wait_for_timeout(2500)
    t=await txt();T('أول فتح: نافذة ترحيب',('مرحباً بك' in t) and ('جرّب 14 يوماً مجاناً' in t) and ('اشترك الآن' in t))
    T('عدد المقاعد 1000',await p.evaluate("PRO.founders")==1000)
    await p.evaluate("closeSheet()");await p.reload();await p.wait_for_timeout(2500)
    t=await txt();T('الفتح الثاني: لا نافذة بل لافتة',('مرحباً بك' not in t) and await p.evaluate("!!document.querySelector('.wlb')"))
    await p.click('.wlb [data-act=wltrial]');await p.wait_for_timeout(400)
    T('بدء التجربة: trial 14',await p.evaluate("[proStatus().state,proStatus().daysLeft]")==['trial',14])
    t=await txt();T('لافتة التجربة تعرض الأيام',('تجربة Pro' in t) and ('14' in t))
    await p.reload();await p.wait_for_timeout(2500);T('بعد إعادة الفتح تبقى التجربة + لافتة',await p.evaluate("proStatus().state=='trial'&&!!document.querySelector('.wlb')"))
    T('الميزات مفتوحة أثناء التجربة',await p.evaluate("proAllowed('mw')"))
    # انتهاء التجربة
    await p.evaluate("localStorage.setItem('trial0',String(Date.now()-20*864e5));localStorage.removeItem('wld')");await p.reload();await p.wait_for_timeout(2500)
    t=await txt();T('انتهت التجربة: نافذة + لافتة',('انتهت فترة التجربة' in t) and await p.evaluate("!!document.querySelector('.wlb.wend')"))
    await p.evaluate("closeSheet()")
    await p.evaluate("proGate('mw')");await p.wait_for_timeout(300);t=await txt()
    T('نافذة الميزة المقفلة واضحة',('هذه الميزة للمشتركين' in t) and ('اشترك الآن' in t) and ('لديّ كود' in t) and ('جرّب مجاناً' not in t))
    await p.evaluate("closeSheet()")
    # Pro
    await p.evaluate("(async c=>{await proActivate(c);await proInit();render()})",K['code']);await p.wait_for_timeout(500)
    T('Pro: لا لافتة ترحيب',await p.evaluate("!document.querySelector('.wlb')"))
    await p.evaluate("proSheet()");await p.click('[data-act=prooff]');await p.wait_for_timeout(300);t=await txt()
    T('إلغاء: تحذير ظاهر',('تحذير' in t) and ('الدعم' in t))
    await p.click('[data-act=pro]');await p.wait_for_timeout(200)
    T('التراجع لا يلغي',await p.evaluate("proStatus().state")=='pro')
    await p.click('[data-act=prooff]');await p.click('[data-act=prooffgo]');await p.wait_for_timeout(600)
    T('تأكيد بلا قفل: يلغي',await p.evaluate("proStatus().state")!='pro')
    # مع رمز قفل
    pin='4826';h=hashlib.sha256(('ll-v1:'+pin).encode()).hexdigest()
    await p.evaluate("(async c=>{await proActivate(c);await proInit()})",K['code'])
    await p.evaluate("([h])=>{localStorage.setItem('pinh',h);localStorage.setItem('pinl','4');sessionStorage.setItem('unl','1')}",[h])
    await p.reload();await p.wait_for_timeout(2000)
    await p.evaluate("proSheet()");await p.click('[data-act=prooff]');await p.click('[data-act=prooffgo]');await p.wait_for_timeout(500)
    T('مع قفل: يطلب الرمز',await p.evaluate("!!document.querySelector('#lk')"))
    for d in '9999':await p.keyboard.press(d)
    await p.wait_for_timeout(600);T('رمز خاطئ: لا يلغي',await p.evaluate("proStatus().state")=='pro')
    for d in pin:await p.keyboard.press(d)
    await p.wait_for_timeout(1000);T('رمز صحيح: يلغي',await p.evaluate("proStatus().state")!='pro')
    print('errors',E);await b.close()
  print('FAILS',R.count(False))
asyncio.run(main())
