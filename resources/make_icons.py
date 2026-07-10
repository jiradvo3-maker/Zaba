#!/usr/bin/env python3
"""Vygeneruje master ikonu, adaptive icon vrstvy a splash screen pro hru Žába."""
import numpy as np
from PIL import Image, ImageDraw

def radial_gradient(size, inner, outer, center=None, radius=None):
    w, h = size
    if center is None:
        center = (w / 2, h / 2)
    if radius is None:
        radius = max(w, h) * 0.75
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2) / radius
    d = np.clip(d, 0, 1)[..., None]
    inner_a = np.array(inner, dtype=np.float64)
    outer_a = np.array(outer, dtype=np.float64)
    arr = (inner_a + (outer_a - inner_a) * d).astype(np.uint8)
    return Image.fromarray(arr, mode='RGB')

def draw_frog(draw, cx, cy, s, eye_shift=0):
    # zadní nohy
    leg_color = (63, 145, 66)
    for sign in (-1, 1):
        draw.ellipse([cx + sign * s * 0.62 - s * 0.26, cy + s * 0.14 - s * 0.17,
                      cx + sign * s * 0.62 + s * 0.26, cy + s * 0.14 + s * 0.17], fill=leg_color)
    # přední nohy
    for sign in (-1, 1):
        draw.ellipse([cx + sign * s * 0.42 - s * 0.18, cy - s * 0.4 - s * 0.13,
                      cx + sign * s * 0.42 + s * 0.18, cy - s * 0.4 + s * 0.13], fill=leg_color)
    # tělo
    body_r = s * 0.62
    draw.ellipse([cx - body_r, cy - body_r * 0.9, cx + body_r, cy + body_r * 0.9], fill=(76, 175, 80))
    # skvrny
    spot = (58, 130, 62)
    draw.ellipse([cx - s * 0.28, cy + s * 0.05, cx - s * 0.1, cy + s * 0.18], fill=spot)
    draw.ellipse([cx + s * 0.12, cy - s * 0.02, cx + s * 0.3, cy + s * 0.1], fill=spot)
    # oči (bulvy)
    eye_r = s * 0.26
    for sign in (-1, 1):
        ex, ey = cx + sign * s * 0.3, cy - s * 0.5
        draw.ellipse([ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r], fill=(234, 252, 224))
        pr = s * 0.13
        draw.ellipse([ex - pr, ey - pr + eye_shift, ex + pr, ey + pr + eye_shift], fill=(22, 50, 26))
        hr = s * 0.045
        draw.ellipse([ex - hr + pr * 0.3, ey - hr - pr * 0.4, ex + hr + pr * 0.3, ey + hr - pr * 0.4], fill=(255, 255, 255))
    # úsměv
    smile_bbox = [cx - s * 0.28, cy - s * 0.12, cx + s * 0.28, cy + s * 0.28]
    draw.arc(smile_bbox, start=20, end=160, fill=(22, 60, 30), width=max(2, int(s * 0.045)))

def make_icon(path, size, with_bg=True, bg_only=False, fg_only=False, pad=0.0):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if with_bg or bg_only:
        bg = radial_gradient((size, size), (58, 158, 82), (24, 90, 46))
        img.paste(bg, (0, 0))
    if not bg_only:
        draw = ImageDraw.Draw(img)
        cx, cy = size / 2, size / 2 + size * 0.03
        s = size * (0.30 - pad * 0.3)
        draw_frog(draw, cx, cy, s)
    img.save(path)

def make_splash(path, size=2732, bg=(10, 36, 20)):
    img = radial_gradient((size, size), (28, 92, 50), bg).convert('RGBA')
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    s = size * 0.16
    draw_frog(draw, cx, cy, s)
    img.save(path)

if __name__ == '__main__':
    import os
    out = os.path.dirname(os.path.abspath(__file__))
    make_icon(f'{out}/icon.png', 1024)
    make_icon(f'{out}/icon-foreground.png', 1024, with_bg=False, pad=0.15)
    make_icon(f'{out}/icon-background.png', 1024, bg_only=True)
    make_icon(f'{out}/icon-only.png', 1024, with_bg=False)
    make_splash(f'{out}/splash.png')
    make_splash(f'{out}/splash-dark.png', bg=(4, 14, 8))
    print('OK')
