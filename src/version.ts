/**
 * Családi Receptkönyv alkalmazás verzió- és kiadásinformációk
 * Itt központosítva kezelhető a verziószám a jövőbeli fejlesztések és nyomon követés érdekében.
 */
export const APP_VERSION = 'v1.0.6';
export const APP_BUILD_NAME = 'Raspberry Pi Touch Kiadás';
export const APP_RELEASE_DATE = '2025. május';
export const APP_CHANGELOG = [
  {
    version: 'v1.0.6',
    title: 'Közvetlen Letöltési Motor & Vágólap Telepítő',
    features: [
      'Új letöltési motor Data URL és Base64 támogatással az iframe blokkolások elkerülésére',
      'Közvetlen szerver- és kódmásoló panel a felületen (server.ts és recipeExtractor.ts)',
      '100% offline, letöltés nélküli 1-másodperces javítóparancs a Raspberry Pi terminálhoz',
      'Drasztikusan optimalizált, pehelykönnyű (<250 KB) telepítőcsomag méret'
    ]
  },
  {
    version: 'v1.0.5',
    title: 'Szerver Port Fix & Fejlesztői Környezet Stabilitás',
    features: [
      'Dev szerver portkezelés javítása: biztos port 3000 kötés AI Studio környezetben az EADDRINUSE elkerülésére',
      'Raspberry Pi 5000-es port prioritás megőrzése',
      'Vite HMR websocket ütközések kiküszöbölése beágyazott Express szerverben',
      'v1.0.5 frissített telepítőcsomagok generálása'
    ]
  },
  {
    version: 'v1.0.4',
    title: 'Biztonságos Iframe Blob Letöltés & 1-soros Pi Fix',
    features: [
      'Közvetlen JavaScript Blob letöltés az előnézeti iframe-ből a böngészési blokkolás elkerülésére',
      'Statikus / közvetlen letöltési linkek és 1-soros sed parancs a Pi-n lévő import hiba azonnali javításához',
      'Node 22 szigorú ES modul kompatibilitás ellenőrizve'
    ]
  },
  {
    version: 'v1.0.3',
    title: 'Node.js 22 ESM Modulbetöltési Javítás',
    features: [
      'Kifejezett .ts kiterjesztés megadása az ES Modul importoknál a Node 22 futtatókörnyezethez',
      'Hiba nélküli npm run preview és npm start indítás a Raspberry Pi-n',
      'Digitális PDF szövegkinyerés és közvetlen Google Gemini API kulcs mentés'
    ]
  },
  {
    version: 'v1.0.2',
    title: 'Ingyenes Offline PDF Beolvasás & Ingyenes Gemini AI Beállítás',
    features: [
      'Digitális PDF receptek 100% ingyenes, helyi (offline) szöveg- és hozzávaló kinyerése API kulcs nélkül',
      'Közvetlen ingyenes Google Gemini API kulcs beállítási lehetőség a felületen (SSH/nano nélkül)',
      'Intelligens magyar receptstruktúra felismerő (hozzávalók, adagok, lépések, kategóriák)',
      'Továbbfejlesztett hibakezelés és Raspberry Pi szinkronizáció'
    ]
  },
  {
    version: 'v1.0.1',
    title: 'Hálózati & URL Import Stabilitási Frissítés',
    features: [
      'Beépített közvetlen Schema.org receptkinyerő motor (Nosalty, Mindmegette stb.)',
      'Vite Preview és Express szerver kétoldalú API kiszolgálás a Pi-n',
      'Tetszőleges saját kategóriák felvétele és kezelése a recepttárban',
      'Automata háttérindítás (systemd service) szkript támogatás'
    ]
  },
  {
    version: 'v1.0.0',
    title: 'Kezdő stabil kiadás',
    features: [
      'Receptkezelés: létrehozás, szerkesztés, törlés (megerősítő ablakkal)',
      'Intelligens receptbeolvasás: URL, kép (OCR/AI), PDF és szövegből',
      'Konyhai Főzőmód lépésről-lépésre időzítőkkel',
      'Interaktív bevásárlólista és családtag kedvencek szűrése',
      'Kompakt, érintőképernyő-barát fejléc legördülő navigációval',
      'Helyi adatmentés és Raspberry Pi export/import'
    ]
  }
];
