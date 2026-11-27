#!/usr/bin/env python3
"""يولّد صفحات عربية «ممسوحة بشكل سيئ» صناعياً لاختبار N11: ميل، خلفية رمادية متدرجة، ختم أزرق دائري، ختم أسود، توقيع، خط يدوي، إطار، حافة ماسح، ضجيج، JPEG.
الاستعمال: python3 tools/n11-fixtures.py /tmp/n11fx   → يكتب page_*.png و page_*.rgba و gt.json (النص الحقيقي لكل صفحة)
ملاحظة صريحة: هذه صور صناعية (خط DejaVu) تقيس اتجاه التحسن فقط؛ لا تغني عن اختبار مستنداتك الحقيقية."""
import sys, os, json, asyncio, base64
from playwright.async_api import async_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n11fx'; os.makedirs(OUT, exist_ok=True)
LINES = [
 ('c', 'بالاستئناف العالي ومجلس الدولة'),
 ('r', 'السيد الأستاذ / رئيس نيابة الدخيلة'),
 ('r', 'تحية طيبة وبعد'),
 ('r', 'مقدمه لسيادتكم السيد علاء عرفات محمد حمدان'),
 ('r', 'وأتشرف بعرض الآتي'),
 ('r', 'حيث إنني متزوج من السيدة نرمين كامل أحمد كامل'),
 ('r', 'وحيث إنه قد حدثت بيننا خلافات زوجية وقامت بتهديدي'),
 ('r', 'بأنها سوف تقوم بنقل جميع المنقولات من الشقة'),
 ('r', 'الكائنة في شارع طرابلس متفرع من شارع قصر القويري'),
 ('r', 'بالدخيلة الإسكندرية دون علمي الأمر الذي أخشى معه'),
 ('r', 'أن تقوم بتغيير حالة الشقة ومحتوياتها'),
 ('r', 'لذا أتقدم لسيادتكم بطلب التكرم بالموافقة على تحرير محضر شرطة'),
 ('r', 'لإثبات حالة الشقة وأن جميع المنقولات موجودة بها'),
 ('c', 'وتفضلوا بقبول فائق الاحترام'),
]
# صفحات: (اسم، ميل بالدرجات، ختم أزرق، ختم أسود، توقيع، يدوي، إطار، حافة ماسح، تدرج رمادي، ضجيج، حجم الخط)
PAGES = [
 dict(name='page_hard', tilt=2.4, blue=1, black=1, sign=1, hand=1, frame=1, edge=1, grad=1, noise=1, font=40, w=1800, h=2500),
 dict(name='page_tilt_only', tilt=-3.1, blue=0, black=0, sign=0, hand=0, frame=0, edge=0, grad=0, noise=0, font=40, w=1800, h=2500),
 dict(name='page_stamps_only', tilt=0.0, blue=1, black=1, sign=1, hand=0, frame=0, edge=0, grad=0, noise=0, font=40, w=1800, h=2500),
 dict(name='page_small', tilt=1.2, blue=1, black=0, sign=1, hand=0, frame=0, edge=0, grad=1, noise=1, font=22, w=1000, h=1400),
]
JS = """async(P)=>{const [LN,W,H,F]=[P.lines,P.w,P.h,P.font];
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,W,H);
 /* النص */
 x.fillStyle='#111';x.direction='rtl';x.font='bold '+F+'px "DejaVu Sans", sans-serif';
 const lh=F*2.05;let y=F*3.2,pos=[];
 LN.forEach(([k,t],i)=>{x.textAlign=k=='c'?'center':'right';const px=k=='c'?W/2:W-F*2.2;x.font=(i==0?'bold ':'')+F+'px "DejaVu Sans", sans-serif';x.fillText(t,px,y);y+=lh;if(i==2||i==4)y+=lh*0.5});
 const bottom=y;
 /* ختم أزرق دائري مع نص (يتقاطع مع آخر سطر قليلاً) */
 const stamp=(cx,cy,r,col,txt)=>{x.save();x.strokeStyle=col;x.fillStyle=col;x.globalAlpha=0.82;x.lineWidth=r*0.07;x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();x.lineWidth=r*0.03;x.beginPath();x.arc(cx,cy,r*0.8,0,7);x.stroke();
  x.textAlign='center';x.direction='rtl';x.font='bold '+(r*0.22)+'px "DejaVu Sans"';x.fillText(txt[0],cx,cy-r*0.25);x.fillText(txt[1],cx,cy+r*0.12);x.font=(r*0.18)+'px "DejaVu Sans"';x.fillText(txt[2],cx,cy+r*0.45);x.restore()};
 if(P.blue)stamp(W*0.28,bottom+F*3.2,F*3.6,'#1d3fbf',['نيابة الدخيلة','قيد برقم 4/1981','الإسكندرية']);
 if(P.black)stamp(W*0.62,bottom+F*3.6,F*2.7,'#222',['محكمة','الدخيلة','الجزئية']);
 /* توقيع: خربشة متصلة */
 if(P.sign){x.save();x.strokeStyle='#0a0a3a';x.lineWidth=3;x.beginPath();let sx=W*0.62,sy=bottom+F*0.5;x.moveTo(sx,sy);for(let i=0;i<26;i++){sx+=F*0.5*(Math.sin(i*1.7)+0.4);sy+=F*0.35*Math.cos(i*2.3);x.lineTo(sx,sy)}x.stroke();x.restore()}
 /* خط يدوي في الهامش: كلمات متعرجة */
 if(P.hand){x.save();x.strokeStyle='#1a1a1a';x.lineWidth=4;for(let k=0;k<3;k++){x.beginPath();let hx=W*0.1,hy=F*6+k*F*2.4;x.moveTo(hx,hy);for(let i=0;i<22;i++){hx+=F*0.35;hy+=Math.sin(i*1.3+k)*F*0.5;x.lineTo(hx,hy)}x.stroke()}x.restore()}
 /* إطار الصفحة */
 if(P.frame){x.save();x.strokeStyle='#222';x.lineWidth=5;x.strokeRect(F*0.9,F*0.9,W-F*1.8,H-F*1.8);x.restore()}
 /* ميل + خلفية */
 const c2=document.createElement('canvas');c2.width=W;c2.height=H;const y2=c2.getContext('2d');
 y2.fillStyle=P.grad?'#9a9a94':'#e6e6e0';y2.fillRect(0,0,W,H);
 y2.save();y2.translate(W/2,H/2);y2.rotate(P.tilt*Math.PI/180);y2.translate(-W/2,-H/2);
 const gx=y2.createLinearGradient(0,0,W,H*0.4);gx.addColorStop(0,P.grad?'#cfcfc8':'#fbfbf8');gx.addColorStop(1,P.grad?'#a9a9a0':'#f3f3ee');y2.fillStyle=gx;y2.fillRect(0,0,W,H);
 y2.globalCompositeOperation='multiply';y2.drawImage(c,0,0);y2.restore();
 if(P.edge){y2.fillStyle='#222';y2.fillRect(0,0,W*0.012,H)}
 /* ضجيج وغبار */
 const im=y2.getImageData(0,0,W,H),d=im.data;let s=12345;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
 if(P.noise){for(let i=0;i<d.length;i+=4){const n=(rnd()-0.5)*34;d[i]+=n;d[i+1]+=n;d[i+2]+=n}for(let k=0;k<W*H/2500;k++){const px=(rnd()*W)|0,py=(rnd()*H)|0,r=1+((rnd()*2)|0);for(let a=0;a<r;a++)for(let b=0;b<r;b++){const p=((py+b)*W+px+a)*4;d[p]=d[p+1]=d[p+2]=70}}}
 y2.putImageData(im,0,0);
 return c2.toDataURL('image/jpeg',P.noise?0.55:0.8)}"""
async def main():
    gt = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); p = await (await b.new_context()).new_page(); await p.set_content('<html><body></body></html>')
        for P in PAGES:
            args = dict(P); args['lines'] = LINES
            url = await p.evaluate(JS, args)
            raw = base64.b64decode(url.split(',')[1]); open(f"{OUT}/{P['name']}.jpg", 'wb').write(raw)
            import cv2, numpy as np
            im = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR); cv2.imwrite(f"{OUT}/{P['name']}.png", im)
            rgba = cv2.cvtColor(im, cv2.COLOR_BGR2RGBA); open(f"{OUT}/{P['name']}.rgba", 'wb').write(rgba.tobytes())
            gt[P['name']] = dict(w=int(im.shape[1]), h=int(im.shape[0]), tilt=P['tilt'], lines=[t for _, t in LINES], font=P['font'], **{k: P[k] for k in ('blue', 'black', 'sign', 'hand', 'frame', 'edge')})
            print('✓', P['name'], im.shape[1], 'x', im.shape[0])
        await b.close()
    json.dump(gt, open(f'{OUT}/gt.json', 'w'), ensure_ascii=False, indent=1)
asyncio.run(main())
