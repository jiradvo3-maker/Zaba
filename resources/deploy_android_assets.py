#!/usr/bin/env python3
"""Nahradí výchozí Capacitor ikony a splash screeny naší grafikou žáby."""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(ROOT, '..', 'android', 'app', 'src', 'main', 'res')

LEGACY_SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND_SIZES = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
SPLASH_SIZES = {'mdpi': 480, 'hdpi': 800, 'xhdpi': 1280, 'xxhdpi': 1600, 'xxxhdpi': 1920}

icon_full = Image.open(os.path.join(ROOT, 'icon.png')).convert('RGBA')       # se zeleným pozadím, kulaté rohy si udělá launcher
icon_fg = Image.open(os.path.join(ROOT, 'icon-foreground.png')).convert('RGBA')  # žába bez pozadí, na 108dp canvasu
splash = Image.open(os.path.join(ROOT, 'splash.png')).convert('RGBA')

def save_resized(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)

for density, size in LEGACY_SIZES.items():
    d = os.path.join(RES, f'mipmap-{density}')
    save_resized(icon_full, os.path.join(d, 'ic_launcher.png'), size)
    save_resized(icon_full, os.path.join(d, 'ic_launcher_round.png'), size)

for density, size in FOREGROUND_SIZES.items():
    d = os.path.join(RES, f'mipmap-{density}')
    save_resized(icon_fg, os.path.join(d, 'ic_launcher_foreground.png'), size)

# Splash - vycentrovaný na zeleném pozadí, poměr stran zachován výřezem na čtverec
for density, size in SPLASH_SIZES.items():
    resized = splash.resize((size, size), Image.LANCZOS)
    for orient in ('port', 'land'):
        d = os.path.join(RES, f'drawable-{orient}-{density}')
        resized.save(os.path.join(d, 'splash.png'))

# hlavní fallback splash (drawable/splash.png, bez density)
splash.resize((1200, 1200), Image.LANCZOS).save(os.path.join(RES, 'drawable', 'splash.png'))

# barva pozadí adaptive ikony
bg_xml = os.path.join(RES, 'values', 'ic_launcher_background.xml')
with open(bg_xml, 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#0d3b24</color>\n</resources>\n')

print('Android ikony a splash screeny aktualizovány.')
