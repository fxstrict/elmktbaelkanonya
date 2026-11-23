#!/usr/bin/env python3
"""صور اختبار N3 (اكتشاف الحواف، الميلان، الاتجاه، الكتاب): صفحات بنص عربي/لاتيني حقيقي (PIL+raqm) في مشاهد بمنظور وظلال وضوضاء.
الاستعمال: python3 tools/n3-fixtures.py /tmp/n3   → يكتب ملفات .rgba خام (+ gt.json). يحتاج PIL و numpy فقط."""
import sys, json, math, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n3'
os.makedirs(OUT, exist_ok=True)
random.seed(7); np.random.seed(7)
AR = ["المادة الأولى يلتزم الطرف الأول بتسليم العين المؤجرة للطرف الثاني خالية من الشواغل في الموعد المتفق عليه.",
      "حضر أمامنا السيد المحامي بصفته وكيلاً عن الموكل بموجب التوكيل الرسمي العام رقم ١٢٣٤ لسنة ٢٠٢٦ وقرر ما يلي.",
      "تقدم المدعي بصحيفة دعوى طالباً الحكم بإلزام المدعى عليه بأن يؤدي له المبلغ المطالب به مع المصروفات وأتعاب المحاماة.",
      "وحيث إن الطعن استوفى أوضاعه الشكلية فهو مقبول شكلاً وفي الموضوع قررت المحكمة رفضه وإلزام الطاعن بالمصروفات."]
EN = ["The tenant undertakes to pay the monthly rent on or before the fifth day of each calendar month without any delay.",
      "This agreement is made and entered into on the date stated above by and between the parties named herein below.",
      "The court having considered the pleadings and the evidence on record, hereby orders that the appeal be dismissed.",
      "Any notice required to be given under this contract shall be in writing and delivered to the address of the party."]
FONTS = {'en': ['/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'],
         'ar': ['/usr/share/fonts/truetype/freefont/FreeSerif.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/freefont/FreeSans.ttf']}
def wrap(draw, text, font, maxw, rtl):
    kw = dict(direction='rtl', language='ar') if rtl else {}
    words, lines, cur = text.split(), [], []
    for w in words:
        t = ' '.join(cur + [w])
        if draw.textlength(t, font=font, **kw) <= maxw: cur.append(w)
        else: lines.append(cur); cur = [w]
    if cur: lines.append(cur)
    return lines
def page(lang, W=1240, H=1754, size=30, fi=0, tint=(255, 255, 255), title=True, margin=130, just=False, gapk=0.9, indent=0, pgraphs=1):
    im = Image.new('RGB', (W, H), tint); d = ImageDraw.Draw(im); rtl = lang == 'ar'
    f = ImageFont.truetype(FONTS[lang][fi % 3], size); fb = ImageFont.truetype(FONTS[lang][fi % 3], int(size * 1.5))
    kw = dict(direction='rtl', language='ar') if rtl else {}
    y = margin
    if title:
        t = 'عقد إيجار' if rtl else 'LEASE AGREEMENT'; w = d.textlength(t, font=fb, **kw); d.text(((W - w) / 2, y), t, font=fb, fill=(20, 20, 20), **kw); y += int(size * 3)
    src = AR if rtl else EN; i = 0
    while y < H - margin - size * 2:
        txt = ' '.join(src[(i + j) % 4] for j in range(pgraphs + 1)); first = True
        lines = wrap(d, txt, f, W - 2 * margin - (indent if True else 0), rtl)
        for li, ws in enumerate(lines):
            if y > H - margin - size: break
            ind = indent if li == 0 else 0; avail = W - 2 * margin - ind; ln = ' '.join(ws)
            if just and li < len(lines) - 1 and len(ws) > 1:
                wl = [d.textlength(x, font=f, **kw) for x in ws]; gap = (avail - sum(wl)) / (len(ws) - 1)
                x = (W - margin - ind) if rtl else (margin + ind)
                for x_, wd in zip(ws, wl):
                    if rtl: d.text((x - wd, y), x_, font=f, fill=(28, 28, 30), **kw); x -= wd + gap
                    else: d.text((x, y), x_, font=f, fill=(28, 28, 30), **kw); x += wd + gap
            else:
                w = d.textlength(ln, font=f, **kw); x = (W - margin - ind - w) if rtl else (margin + ind)
                d.text((x, y), ln, font=f, fill=(28, 28, 30), **kw)
            y += int(size * 1.7)
        y += int(size * gapk); i += 1
    return im
def save(name, im, gt=None):
    a = np.asarray(im.convert('RGBA'), dtype=np.uint8); open(f'{OUT}/{name}.rgba', 'wb').write(a.tobytes())
    G = {'w': im.width, 'h': im.height}; G.update(gt or {}); GT[name] = G
    if '--png' in sys.argv: im.save(f'{OUT}/{name}.png')
GT = {}
def homography(src, dst):
    A = []; B = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float))
def background(kind, W, H):
    if kind == 'dark': c = np.full((H, W, 3), (38, 40, 46), float)
    elif kind == 'wood':
        yy, xx = np.mgrid[0:H, 0:W]; s = np.sin(yy / 9.0 + np.sin(xx / 170.0) * 3) * 14
        c = np.stack([150 + s, 108 + s * .8, 66 + s * .6], -1)
    elif kind == 'gray': c = np.full((H, W, 3), (196, 197, 202), float)
    elif kind == 'white': c = np.full((H, W, 3), (232, 232, 230), float)
    elif kind == 'green': c = np.full((H, W, 3), (46, 92, 66), float)
    c += np.random.normal(0, 3, c.shape); return c
def scene(name, pg, quad, bg='dark', shadow=0.0, noise=3.0, blur=1.0, W=1600, H=1200, gt_extra=None):
    """يضع الصفحة pg داخل مشهد بالرباعي quad (TL,TR,BR,BL بإحداثيات المشهد). GT = quad."""
    pw, ph = pg.size; Hm = homography(quad, [(0, 0), (pw, 0), (pw, ph), (0, ph)])  # مشهد → صفحة
    pgA = pg.convert('RGB'); mask = Image.new('L', (pw, ph), 255)
    # تحويل بدقة فرعية: 2× ثم تصغير لحواف ناعمة
    S = 2; big = (W * S, H * S); Hs = homography([(x * S, y * S) for x, y in quad], [(0, 0), (pw, 0), (pw, ph), (0, ph)])
    c = Hs.tolist()
    layer = pgA.transform(big, Image.PERSPECTIVE, c, Image.BICUBIC).resize((W, H), Image.LANCZOS)
    m = mask.transform(big, Image.PERSPECTIVE, c, Image.BILINEAR).resize((W, H), Image.LANCZOS)
    base = Image.fromarray(np.clip(background(bg, W, H), 0, 255).astype(np.uint8))
    sc = Image.composite(layer, base, m); a = np.asarray(sc, float)
    if shadow:
        xx = np.linspace(0, 1, W)[None, :, None]; yy = np.linspace(0, 1, H)[:, None, None]
        a *= (1 - shadow * (0.6 * xx + 0.4 * yy))
    a += np.random.normal(0, noise, a.shape); im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    g = {'quad': [list(map(float, p)) for p in quad], 'kind': 'scene', 'bg': bg}; g.update(gt_extra or {}); save(name, im, g)
def rect(cx, cy, w, h, ang=0, persp=(0, 0, 0, 0)):
    pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]; a = math.radians(ang); r = []
    for i, (x, y) in enumerate(pts):
        X = x * math.cos(a) - y * math.sin(a) + cx + persp[i * 0] * 0; Y = x * math.sin(a) + y * math.cos(a) + cy; r.append((X, Y))
    # منظور بسيط: إزاحة الزوايا
    d = [(persp[0], persp[1]), (persp[2], persp[3]), (-persp[0], -persp[1] * .5), (-persp[2], -persp[3] * .5)]
    return [(p[0] + q[0], p[1] + q[1]) for p, q in zip(r, d)]
if __name__ == '__main__':
    P_en = page('en', fi=0); P_ar = page('ar', fi=0); P_ar2 = page('ar', fi=1, size=26)
    scene('sc01_en_dark', P_en, rect(800, 600, 760, 1075, 8, (20, -10, -25, 15)), 'dark')
    scene('sc02_ar_wood', P_ar, rect(780, 610, 780, 1100, -12, (-35, 25, 30, 40)), 'wood', shadow=0.25)
    scene('sc03_ar_gray_lowcontrast', P_ar2, rect(800, 600, 760, 1075, 5, (15, 10, -10, 20)), 'gray')
    scene('sc04_en_white_verylow', P_en, rect(800, 600, 760, 1075, -4, (10, 10, 10, 10)), 'white')
    scene('sc05_cutoff', P_ar, [(300, -120), (1250, 40), (1330, 1330), (230, 1260)], 'dark')
    scene('sc06_fills_frame', P_en, [(10, 8), (1590, 6), (1594, 1195), (8, 1193)], 'dark', gt_extra={'fills': True})
    scene('sc07_ar_dark_shadow', P_ar, rect(800, 600, 740, 1050, 15, (0, 0, 0, 0)), 'dark', shadow=0.45)
    scene('sc08_yellow_paper', page('ar', tint=(244, 226, 150)), rect(800, 600, 700, 990, -6, (18, 6, -12, 14)), 'dark')
    scene('sc09_card_on_wood', Image.new('RGB', (856, 540), (225, 235, 245)), rect(800, 600, 760, 480, 12, (10, 12, -14, 8)), 'wood')
    scene('sc10_en_green_desk', P_en, rect(800, 590, 780, 1100, 3, (30, 20, -30, 15)), 'green')
    # --- ميلان (صفحات مسطحة مقصوصة) ---
    for lang, pg in (('en', P_en), ('ar', P_ar)):
        for a in (-7, -3, -1, 0, 2, 5, 9):
            im = pg.rotate(-a, resample=Image.BICUBIC, fillcolor=(255, 255, 255)); save(f'skew_{lang}_{a}', im, {'kind': 'skew', 'skew_deg': a})
    # --- اتجاه (0/90/180/270) بمقاسات وخطوط متنوعة ---
    k = 0
    for lang in ('en', 'ar'):
        for fi in (0, 1, 2):
            for sz in (22, 30, 40):
                pg = page(lang, fi=fi, size=sz, title=(fi != 1))
                for rot in (0, 90, 180, 270):
                    im = pg.rotate(rot, expand=True) if rot else pg; save(f'ori_{lang}_f{fi}_s{sz}_r{rot}', im, {'kind': 'ori', 'rot': rot, 'lang': lang})
    # --- اتجاه: تنويعات التنسيق (مضبوط الهوامش، بلا فراغ بين الفقرات، إزاحة السطر الأول، فقرات طويلة) ---
    for lang in ('en', 'ar'):
        for fi in (0, 1, 2):
            for tag, kw in (('just', dict(just=True, gapk=1.2)), ('nogap', dict(just=True, gapk=0.0)), ('indent', dict(indent=70, gapk=0.1, just=True)), ('long', dict(pgraphs=3, gapk=1.0, just=True))):
                pg = page(lang, fi=fi, size=28, **kw)
                for rot in (0, 90, 180, 270):
                    im = pg.rotate(rot, expand=True) if rot else pg; save(f'ori2_{lang}_f{fi}_{tag}_r{rot}', im, {'kind': 'ori2', 'rot': rot, 'lang': lang, 'tag': tag})
    # --- كتاب: صفحتان ووسط ظليل ---
    for i, (frac, lang) in enumerate(((0.5, 'ar'), (0.47, 'ar'), (0.53, 'en'), (0.5, 'en'))):
        pw, ph = 900, 1300; W = pw * 2; sp = Image.new('RGB', (W, ph), (250, 248, 242))
        L = page(lang, W=pw, H=ph, size=26, title=False, margin=90); R = page(lang, W=pw, H=ph, size=26, title=False, margin=90)
        sp.paste(L, (0, 0)); sp.paste(R, (pw, 0)); a = np.asarray(sp, float); gx = int(W * frac) if frac != .5 else pw
        xs = np.arange(W)[None, :, None]; sh = np.exp(-((xs - gx) / 38.0) ** 2) * 0.55; a = a * (1 - sh)
        # حقل بلا نص حول الوسط (هامش داخلي)
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); save(f'book_{i}_{lang}', im, {'kind': 'book', 'gx': gx})
    json.dump(GT, open(f'{OUT}/gt.json', 'w'), ensure_ascii=False, indent=1); print('fixtures:', len(GT), '→', OUT)
