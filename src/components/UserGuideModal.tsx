import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  X,
  BookOpen,
  Search,
  Sparkles,
  Flame,
  ShoppingCart,
  Users,
  Server,
  Plus,
  Edit3,
  Trash2,
  Camera,
  Globe,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Share2,
  ChevronRight,
  Lightbulb,
  AlertCircle,
  Smartphone,
  Check,
  ShieldCheck,
  RotateCcw,
  Download
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_NAME } from '../version';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'katalogus' | 'fozomod' | 'bevasarlo' | 'csalad' | 'pi') => void;
  onOpenNewRecipe?: () => void;
}

type GuideSection =
  | 'overview'
  | 'recipes'
  | 'import'
  | 'cooking'
  | 'shopping'
  | 'family'
  | 'raspberry'
  | 'faq';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewRecipe
}) => {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const sections: { id: GuideSection; title: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', title: 'Áttekintés & Gyorsindítás', icon: <Lightbulb className="w-4 h-4 text-amber-600" /> },
    { id: 'recipes', title: 'Receptek kezelése & Törlés', icon: <BookOpen className="w-4 h-4 text-emerald-600" /> },
    { id: 'import', title: '🪄 Receptbeolvasás (URL, Kép, PDF)', icon: <Sparkles className="w-4 h-4 text-purple-600" />, badge: 'Új' },
    { id: 'cooking', title: 'Konyhai Főzőmód & Időzítők', icon: <Flame className="w-4 h-4 text-orange-600" /> },
    { id: 'shopping', title: 'Családi Bevásárlólista', icon: <ShoppingCart className="w-4 h-4 text-blue-600" /> },
    { id: 'family', title: 'Családtagok & Ízlések', icon: <Users className="w-4 h-4 text-pink-600" /> },
    { id: 'raspberry', title: 'Raspberry Pi & Mentés', icon: <Server className="w-4 h-4 text-rose-600" /> },
    { id: 'faq', title: 'Gyakori Kérdések (GYIK)', icon: <HelpCircle className="w-4 h-4 text-teal-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">
                  Családi Receptkönyv Kézikönyv
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-100 text-amber-900 rounded-md border border-amber-300">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Részletes útmutató a program mindennapi konyhai és otthoni használatához
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-medium"
              title="Útmutató nyomtatása"
            >
              <Printer className="w-4 h-4" />
              <span>Nyomtatás</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Topic Selector Bar on Mobile / Desktop */}
        <div className="p-3 sm:px-6 bg-white border-b border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés a leírásban (pl. törlés, pdf, időzítő)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 bg-stone-50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-[11px] text-stone-500 hidden md:block">
            Tipp: Használd a bal oldali menüpontokat a témák közötti gyors ugráshoz.
          </div>
        </div>

        {/* Modal Main Content: Sidebar + Details */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-stone-200 bg-stone-50/60 p-2 sm:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1 shrink-0">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeSection === sec.id
                    ? 'bg-amber-100/80 text-amber-950 font-bold shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {sec.icon}
                  <span className="truncate">{sec.title}</span>
                </div>
                {sec.badge && (
                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 font-bold rounded-md text-[10px]">
                    {sec.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main Article Body */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6">
            {/* If search query entered, show matching highlight */}
            {searchQuery.trim() !== '' ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Keresési találatok a következő kifejezésre: <strong>"{searchQuery}"</strong></span>
                </div>

                <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Recept törlése</span>
                    </h4>
                    <p>
                      Receptet két helyen is törölhetsz: a recept részletes megtekintése ablakban a kuka ikonra kattintva, vagy a <strong>Szerkesztés módban</strong> a bal alsó piros „Recept végleges törlése” gombra kattintva. Minden esetben egy biztonsági jóváhagyó ablak jelenik meg, hogy véletlenül se vesszen el recept.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>PDF, Kép vagy Weboldal beolvasása</span>
                    </h4>
                    <p>
                      Kattints az <strong>+ Új Recept</strong> gombra, ahol a felső lila sávban vagy a bevezető kártyán találod az automatikus beolvasást. Beilleszthetsz weboldal URL-t, készíthetsz fényképet vagy tölthetsz fel szakácskönyv fotót / PDF receptet. A képeket manuálisan, villámgyorsan beillesztheted az „URL / Képfájl feltöltése” gombbal.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-600" />
                      <span>Konyhai Főzőmód & Időzítők</span>
                    </h4>
                    <p>
                      A menüből a <strong>Konyhai Főzőmód</strong>ot választva extra nagy betűkkel, lépésről-lépésre haladhatsz. Minden lépéshez egykattintásos visszaszámláló időzítő tartozik, ami sípolással és vizuális jelzéssel figyelmeztet, ha lejárt az idő.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-600" />
                      <span>Biztonsági Mentés & Export</span>
                    </h4>
                    <p>
                      A láblécben vagy a Raspberry Pi Hub fülön található az <strong>Adatbázis Mentés (JSON)</strong> gomb. Ezzel egyetlen kattintással a számítógépedre vagy a telefonodra mentheted az összes receptet és családi szavazatot.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* SECTION 1: OVERVIEW */}
                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-amber-600" />
                        <span>Üdvözöllek a Családi Receptkönyvben!</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1 leading-relaxed">
                        Ez az alkalmazás kifejezetten a családok és az otthoni konyhák számára készült. Optimálisan működik pulton álló <strong>Raspberry Pi érintőképernyőn</strong>, tableten, okostelefonon és asztali számítógépen is.
                      </p>
                    </div>

                    {/* Quick navigation feature cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-xl border border-stone-200 bg-amber-50/50 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          <span>1. Recepttár & Keresés</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Böngéssz kategóriák szerint, keress összetevőre vagy névre, és jelöld meg a család kedvenceit egy érintéssel.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-purple-50/50 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>2. Intelligens Beolvasás</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Webes linkekből, lefényképezett szakácskönyvből vagy PDF fájlokból másodpercek alatt kész receptet készíthetsz.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-orange-50/50 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <Flame className="w-4 h-4 text-orange-600" />
                          <span>3. Konyhai Főzőmód</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Nem kell maszatos kézzel görgetni: extra nagy gombok, lépésről-lépésre vezetés és beépített időzítők.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-blue-50/50 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                          <span>4. Bevásárlólista</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Bármelyik recept hozzávalóit egy gombnyomással a bevásárlólistára küldheted, a boltban pipálhatod, vagy SMS/WhatsApp üzenetként kimásolhatod.
                        </p>
                      </div>
                    </div>

                    {/* How navigation works */}
                    <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 space-y-2">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-amber-600" />
                        <span>Kompakt fejléc és Érintőképernyős vezérlés</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        A fejlécben a <strong>Recepttár</strong> gomb mindig egy kattintásra elérhető. Mellette a <strong>Menü (legördülő gomb)</strong> segítségével azonnal átválthatsz a <strong>Főzőmódra</strong>, a <strong>Bevásárlólistára</strong>, a <strong>Családtagokra</strong> vagy a <strong>Raspberry Pi Hubra</strong> anélkül, hogy a gombok zsúfolttá tennék a képernyőt.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab?.('katalogus');
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Recepttár megnyitása</span>
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenNewRecipe?.();
                        }}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Új Recept hozzáadása</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION 2: RECIPES MANAGEMENT */}
                {activeSection === 'recipes' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-emerald-600" />
                        <span>Receptek Kezelése, Szerkesztése és Törlése</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        Itt megtalálod, hogyan adhatsz hozzá új ételeket kézzel, hogyan módosíthatod őket, és hogyan törölheted a felesleges recepteket.
                      </p>
                    </div>

                    {/* Adding recipes */}
                    <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3 shadow-2xs">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 text-emerald-800">
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span>1. Új Recept Hozzáadása</span>
                      </h4>
                      <ol className="list-decimal list-inside text-xs text-stone-600 space-y-1.5 leading-relaxed pl-1">
                        <li>Kattints a fejléc jobb felső részén található narancssárga <strong>+ Új Recept</strong> gombra.</li>
                        <li>Add meg a recept nevét, kategóriáját (pl. Levesek, Főételek, Desszertek), az adagok számát és az időtartamot.</li>
                        <li><strong>Hozzávalók megadása:</strong> Írd be az összetevő nevét, a mennyiséget és a mértékegységet (pl. g, dkg, ml, ek, db). Az „+ Új hozzávaló” gombbal adhatsz hozzá további sorokat.</li>
                        <li><strong>Elkészítés lépései:</strong> Rögzítsd sorrendben a teendőket. Minden lépéshez beállítható egy becsült időtartam (perc), ami a főzőmódban időzítőként fog megjelenni.</li>
                        <li><strong>Fénykép hozzáadása:</strong> A kézi fotófeltöltés gombbal azonnal tallózhatsz képet a gépedről/telefonodról, vagy beilleszthetsz webes kép URL-t.</li>
                        <li>Kattints a jobb alsó <strong>Mentés</strong> gombra.</li>
                      </ol>
                    </div>

                    {/* Editing recipes */}
                    <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3 shadow-2xs">
                      <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 text-amber-800">
                        <Edit3 className="w-4 h-4 text-amber-600" />
                        <span>2. Meglévő Recept Szerkesztése</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Kattints a recept kártyájára a recepttárban. A megnyíló teljes receptnézet jobb felső sarkában kattints a <strong>ceruza (Szerkesztés)</strong> ikonra. Bármelyik mezőt módosíthatod, új lépéseket szúrhatsz be, majd a <strong>Mentés</strong> gombbal véglegesítheted.
                      </p>
                    </div>

                    {/* Deleting recipes */}
                    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-3">
                      <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>3. Recept Törlése (Biztonsági Megerősítéssel)</span>
                      </h4>
                      <p className="text-xs text-stone-700 leading-relaxed">
                        A törlésre két kényelmes lehetőség van:
                      </p>
                      <ul className="list-disc list-inside text-xs text-stone-700 space-y-1.5 pl-1">
                        <li>
                          <strong>Recept megtekintése közben:</strong> A felső gombsorban kattints a piros <strong>Kuka (Törlés)</strong> ikonra.
                        </li>
                        <li>
                          <strong>Szerkesztő űrlapon:</strong> Az ablak bal alsó sarkában található a piros <strong>„Recept törlése”</strong> gomb.
                        </li>
                      </ul>
                      <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-stone-600 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Véletlen törlés elleni védelem:</strong> A program azonnal egy megerősítő párbeszédpanelt jelenít meg a recept nevével. Csak akkor törlődik a tétel, ha rákattintasz az <em>„Igen, végleges törlés”</em> gombra.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: SMART IMPORT */}
                {activeSection === 'import' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                        <span>Intelligens Receptbeolvasás (URL, Szöveg, Kép, PDF)</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        Hogyan menthetsz le külső recepteket másodpercek alatt gépelés nélkül, mint a professzionális receptalkalmazásokban.
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 text-xs text-purple-950">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>Hol éred el a funkciót?</span>
                      </div>
                      <p>
                        Kattints az <strong>+ Új Recept</strong> gombra. A felugró ablak tetején egy kattintással elérhető a beolvasó panel, illetve a nyitó kártyán a <strong>„🪄 Recept beolvasása linkből, fotóból vagy PDF-ből”</strong> lehetőség.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* URL Import */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <span>1. Weboldal URL linkből</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Találtál egy jó receptet a neten (pl. Nosalty, Mindmegette, Street Kitchen)? Egyszerűen másold be a linket, és a program automatikusan kinyeri a hozzávalókat és a lépéseket.
                        </p>
                      </div>

                      {/* Photo / Camera Import */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <Camera className="w-4 h-4 text-amber-600" />
                          <span>2. Kép / Fotó (OCR & AI)</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Fotózz le egy receptkártyát, újságkivágást vagy a nagyi kézzel írt receptfüzetét. Az AI felismeri a képen lévő szöveget és automatikusan mezőkre bontja.
                        </p>
                      </div>

                      {/* PDF Import */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <FileText className="w-4 h-4 text-rose-600" />
                          <span>3. Digitális PDF receptfájl</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Tölts fel bármilyen letöltött PDF e-szakácskönyvet vagy receptfájlt. A rendszer feldolgozza a dokumentumot és átalakítja szerkeszthető receptté.
                        </p>
                      </div>

                      {/* Raw text paste */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                          <Edit3 className="w-4 h-4 text-emerald-600" />
                          <span>4. Szöveg beillesztése</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Emailben vagy üzenetben kapott receptszöveget egyben beilleszthetsz, a program pedig magától szétválogatja a hozzávalókat és lépéseket.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-stone-700">
                      <div className="font-bold text-stone-900 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-700" />
                        <span>Tipp fényképek hozzáadásához (Kézi fotófeltöltés):</span>
                      </div>
                      <p>
                        A legszebb és leggyorsabb eredmény érdekében a felismert recepthez a fotót a recept űrlapon az <strong>„URL / Képfájl feltöltése”</strong> gombbal tallózhatod be a telefonod galériájából vagy a gépedről. Ez garantálja a tökéletes felbontást másodpercek alatt!
                      </p>
                    </div>
                  </div>
                )}

                {/* SECTION 4: COOKING MODE */}
                {activeSection === 'cooking' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Flame className="w-6 h-6 text-orange-600" />
                        <span>Konyhai Főzőmód & Interaktív Időzítők</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        A főzőmódot kifejezetten arra terveztük, hogy a konyhapulton állva, távolabbról is tisztán olvasható legyen a recept, és ne kelljen bonyolult menükben keresgélni.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-600" />
                          <span>Hogyan indítsd el a főzést?</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Bármelyik receptkártyán vagy a megnyitott recept tetején kattints a narancssárga <strong>„Főzés indítása”</strong> gombra, vagy válaszd ki a fejléc menüjéből a <strong>Konyhai Főzőmód</strong>ot.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Beépített visszaszámláló időzítők</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Ha egy lépés időtartamot tartalmaz (pl. „Főzd 25 percig”), egyetlen érintéssel elindíthatod a visszaszámlálót. A képernyőn tisztán látszik a hátralévő idő, leállíthatod, újraindíthatod, és a lejáratkor sípoló hangjelzés figyelmeztet.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Lépésről-lépésre haladás & Kész állapot</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A nagy <strong>„Előző lépés”</strong> és <strong>„Következő lépés”</strong> gombokkal maszatos ujjakkal is könnyű lapozni. A bal oldali sávban azonnal áttekintheted a hozzávalókat és kipipálhatod az előkészített alapanyagokat.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 5: SHOPPING LIST */}
                {activeSection === 'shopping' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                        <span>Családi Bevásárlólista</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        Soha többé ne hagyd otthon a cetlit: generálj bevásárlólistát receptekből vagy írj be egyedi dolgokat a boltban való vásárláshoz.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Plus className="w-4 h-4 text-blue-600" />
                          <span>Hozzávalók átküldése a bevásárlólistára</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Bármelyik recept nézetében a hozzávalók listája felett kattints az <strong>„Összes hozzávaló a bevásárlólistára”</strong> gombra. A tételek automatikusan bekerülnek a listába a pontos mennyiségekkel.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-stone-800" />
                          <span>Megosztás (WhatsApp / SMS / Viber)</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A Bevásárlólista fülön kattints a <strong>„Másolás (WhatsApp / SMS)”</strong> gombra. A rendszer tiszta, áttekinthető listát készít a vágólapra, amit azonnal elküldhetsz a családtagodnak, aki épp a boltban van!
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Pipálás a boltban</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A boltban haladva egyszerűen koppints a kosárba tett termékekre. A végén a <strong>„Kipipáltak törlése”</strong> gombbal tisztíthatod a listát a következő vásárláshoz.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 6: FAMILY & LIKES */}
                {activeSection === 'family' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-pink-600" />
                        <span>Családtagok, Ízlések & Szavazatok</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        Hogyan tarthatod számon, ki mit szeret a családban, és hogyan tervezhetsz olyan menüt, ami mindenkinek ízlik.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-pink-600" />
                          <span>Aktív családtag kiválasztása</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A fejléc jobb felső sarkában kiválaszthatod, ki az aktív szakács vagy böngésző (pl. Anya, Apa, Krisi, Rolcsi, Mark, Brigi). Így a receptkártyákon a 👍 (Ízlik) vagy 👎 gombra kattintva az ő nevében rögzül a szavazat.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-600" />
                          <span>Szűrés családtagok kedvenceire</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A recepttár szűrősávjában kiválaszthatod bármelyik családtag nevét, és a receptkönyv azonnal csak azokat az ételeket mutatja, amiket ő különösen szeret.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 7: RASPBERRY PI & BACKUP */}
                {activeSection === 'raspberry' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <Server className="w-6 h-6 text-rose-600" />
                        <span>Raspberry Pi Hub & Biztonsági Mentés</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        Minden információ a helyi otthoni szerverként történő futtatásról és a receptek biztonságos mentéséről.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Step 1: Stop previous version */}
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                        <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                          <span>Előző verzió leállítása és biztonsági mentése</span>
                        </h4>
                        <p className="text-xs text-stone-700 leading-relaxed">
                          Nyiss egy SSH vagy terminál ablakot a Raspberry Pi-n, majd állítsd le a futó szervert:
                        </p>
                        <div className="bg-stone-900 text-stone-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                          <div className="text-stone-400"># Ha systemd háttérszolgáltatásként fut:</div>
                          <div>sudo systemctl stop receptkonyv</div>
                          <div className="text-stone-400 pt-1"># Vagy ha háttérfolyamatként fut a Python szerver:</div>
                          <div>pkill -f app.py || pkill -f gunicorn</div>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed pt-1">
                          <strong>Biztonsági másolat (Ne töröld le egyből!):</strong> Nevezd át a meglévő mappát egy biztonsági mentésre, így az eddigi adatbázisod (<code className="bg-white px-1 py-0.5 rounded text-rose-800">receptek.db</code>) és a képeid megmaradnak:
                        </p>
                        <div className="bg-stone-900 text-stone-100 p-3 rounded-lg font-mono text-[11px]">
                          mv /home/pi/recept_adatbazis /home/pi/recept_adatbazis_regi_backup
                        </div>
                      </div>

                      {/* Step 2: GitHub upload & clone */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center font-bold">2</span>
                          <span>Új verzió letöltése a Pi-re (GitHub segítségével)</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Ha a projektet feltöltöd egy privát vagy nyilvános GitHub tárhelyre, a Raspberry Pi-n egyetlen paranccsal letöltheted:
                        </p>
                        <div className="bg-stone-900 text-stone-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                          <div className="text-stone-400"># Lépj a kezdőmappádba és klónozd a projektet:</div>
                          <div>cd /home/pi</div>
                          <div>git clone https://github.com/FELHASZNALONEV/csaladi-receptkonyv.git recept_adatbazis</div>
                          <div>cd recept_adatbazis</div>
                        </div>
                        <p className="text-xs text-stone-500 italic">
                          (Ha később bármit frissítesz, a Pi-n elég lesz kiadni a <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded">git pull</code> parancsot!)
                        </p>
                      </div>

                      {/* Step 3: Run Setup */}
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                        <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                          <span>Egygombos automatikus telepítés & indítás</span>
                        </h4>
                        <p className="text-xs text-stone-700 leading-relaxed">
                          A projekt mappájában indítsd el a mellékelt telepítő szkriptet:
                        </p>
                        <div className="bg-stone-900 text-stone-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                          <div>chmod +x setup_pi.sh</div>
                          <div>./setup_pi.sh</div>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A szkript automatikusan feltelepíti a szükséges csomagokat, beállítja az SQLite adatbázist és elindítja a háttérszolgáltatást.
                        </p>
                      </div>

                      {/* Backup button info */}
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 text-amber-800">
                          <Download className="w-4 h-4 text-amber-600" />
                          <span>Adatbázis Mentés & Visszaállítás (JSON)</span>
                        </h4>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Az alsó láblécben vagy a Raspberry Pi Hub fülön található <strong>„Adatbázis Mentés (JSON)”</strong> gombra kattintva az összes receptedet és szavazatodat egyetlen fájlban letöltheted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 8: FAQ */}
                {activeSection === 'faq' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-teal-600" />
                        <span>Gyakori Kérdések & Gyors Tippek</span>
                      </h3>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1">
                        A leggyakrabban felmerülő kérdések és megoldások a mindennapi használathoz.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                        <div className="font-bold text-stone-900 text-sm">
                          Hogyan tudom törölni a meglévő receptet?
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Nyisd meg a receptet, és kattints a jobb felső kuka ikonra, vagy válaszd a Szerkesztést és a bal alsó piros „Recept törlése” gombot. A felugró ablakban erősítsd meg a törlést.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                        <div className="font-bold text-stone-900 text-sm">
                          Mi történik, ha bezárom a böngészőt, elvesznek a receptjeim?
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Nem! Minden módosítás azonnal elmentődik a böngésző belső memóriájába (LocalStorage). Hosszú távú biztonság érdekében azonban érdemes havonta egyszer az <em>„Adatbázis Mentés (JSON)”</em> gombbal letölteni egy biztonsági mentést.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                        <div className="font-bold text-stone-900 text-sm">
                          Milyen verziót használok most?
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          A képernyő tetején, a „Családi Receptkönyv” cím mellett mindig látható a program verziószáma: jelenleg <strong>{APP_VERSION}</strong> ({APP_BUILD_NAME}).
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1.5">
                        <div className="font-bold text-stone-900 text-sm">
                          Hogyan tudom a receptet kinyomtatni papírra?
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          Bármelyik recept megtekintésekor a felső sávban található a <strong>Nyomtató</strong> ikon. Arra kattintva egy tiszta, reklámmentes, papírbarát nyomtatási nézet jelenik meg.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Családi Receptkönyv</span>
            <span>·</span>
            <span>Verzió: {APP_VERSION}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors cursor-pointer text-xs"
          >
            Értem, bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
