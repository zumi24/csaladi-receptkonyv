/**
 * Családi Receptkönyv alkalmazás verzió- és kiadásinformációk
 * Itt központosítva kezelhető a verziószám a jövőbeli fejlesztések és nyomon követés érdekében.
 */
export const APP_VERSION = 'v1.0.0';
export const APP_BUILD_NAME = 'Raspberry Pi Touch Kiadás';
export const APP_RELEASE_DATE = '2025. május';
export const APP_CHANGELOG = [
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
