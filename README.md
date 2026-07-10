# 🐸 Žába

Mobilní hra typu Frogger: žába musí přeskákat přes silnici až do cíle, ve 5 stále těžších úrovních.

## Jak hra funguje

- Mapa každé úrovně: start (tráva) → 2 pruhy silnice → tráva → 2 pruhy silnice → tráva → 2 pruhy silnice → cíl (tráva).
- Ovládání: šipky na obrazovce, klávesnice (šipky/WASD), nebo tah prstem po herní ploše.
- 3 životy. Náraz autem nebo vypršení času stojí jeden život.
- Na každou úroveň běží čas (60 s → 40 s podle úrovně). Čím rychleji doskáčeš do cíle, tím víc bodů ze zbývajícího času dostaneš.
- Po dohrání všech 5 úrovní přijde vítězná obrazovka s ohňostrojem.
- Po skončení hry (docházející životy) se skóre porovná s Top 10 žebříčkem uloženým v zařízení. Do Top 10 se zapisuje jméno, jinak ne.
- Zvuky (skok, náraz, level, výhra, ohňostroj) jsou generovány přímo přes Web Audio API, žádné externí soubory.

## Struktura projektu

- `www/` – samotná hra (čisté HTML/CSS/JS, žádný build krok potřeba)
- `capacitor.config.json`, `package.json` – obal Capacitor pro Android
- `android/` – nativní Android projekt vygenerovaný Capacitorem
- `resources/` – zdrojová grafika ikon a splash screenu + generovací skripty
- `.github/workflows/build-apk.yml` – automatický build APK

## Vyzkoušet ve webovém prohlížeči

```bash
npm run start
# otevři http://localhost:8080
```

## Jak získat instalační APK

Tento cloudový sandbox nemá přístup k Android SDK / `dl.google.com`, takže APK tady nejde zbuildit přímo. Build proto zajišťuje GitHub Actions:

1. Po pushnutí větve se automaticky spustí workflow **Build Android APK**.
2. Po doběhnutí (záložka *Actions* v repozitáři) si stáhni artefakt `zaba-debug-apk` → obsahuje `app-debug.apk`.
3. APK pošli do telefonu (e-mail, Disk, USB…) a nainstaluj (je potřeba povolit „instalace z neznámých zdrojů“ pro daný zdroj).
4. Pokud pushneš tag `vX.Y.Z`, workflow navíc vytvoří GitHub Release rovnou s přiloženým APK.

### Lokální build (pokud máš Android Studio / SDK)

```bash
npm install
npx cap sync android
cd android
./gradlew assembleDebug
# výstup: android/app/build/outputs/apk/debug/app-debug.apk
```

## Změna ikony / splash

Uprav `resources/make_icons.py` (kreslí ikonu přes Pillow) a spusť:

```bash
python3 resources/make_icons.py
python3 resources/deploy_android_assets.py
```
