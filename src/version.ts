/**
 * Családi Receptkönyv alkalmazás verzió- és kiadásinformációk
 * Itt központosítva kezelhető a verziószám a jövőbeli fejlesztések és nyomon követés érdekében.
 */
export const APP_VERSION = 'v1.0.1';
export const APP_BUILD_NAME = 'Raspberry Pi Touch Kiadás';
export const APP_RELEASE_DATE = '2025. május';
export const APP_CHANGELOG = [
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
