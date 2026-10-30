import { Recipe } from '../types';

export const initialFamilyMembers = [
  { id: 'm-1', name: 'Anya', role: 'admin' as const, avatarColor: 'bg-rose-500' },
  { id: 'm-2', name: 'Apa', role: 'admin' as const, avatarColor: 'bg-blue-600' },
  { id: 'm-3', name: 'Krisi', role: 'user' as const, avatarColor: 'bg-emerald-500' },
  { id: 'm-4', name: 'Rolcsi', role: 'user' as const, avatarColor: 'bg-amber-500' },
  { id: 'm-5', name: 'Mark', role: 'user' as const, avatarColor: 'bg-purple-500' },
  { id: 'm-6', name: 'Brigi', role: 'user' as const, avatarColor: 'bg-pink-500' },
];

export const initialRecipes: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Hagyományos Bográcsos Gulyásleves',
    description: 'Gazdag marhahúsos magyar gulyásleves zamatos zöldségekkel, kalocsai fűszerpaprikával és házi csipetkével.',
    category: 'Levesek',
    chef: 'Apa',
    prepTimeMinutes: 25,
    cookTimeMinutes: 90,
    servings: 6,
    difficulty: 'Közepes',
    tags: ['Hagyományos', 'Marhahús', 'Bográcsos', 'Kiadós'],
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=0k2k5l9H-nQ',
    isFavorite: true,
    likes: ['Anya', 'Apa', 'Rolcsi', 'Mark', 'Brigi'],
    dislikes: [],
    createdAt: '2026-10-15',
    source: 'Családi titkos recept',
    ingredients: [
      { id: 'ing-1', name: 'Marhalábszár kockázva', amount: 800, unit: 'g' },
      { id: 'ing-2', name: 'Vöröshagyma finomra vágva', amount: 3, unit: 'fej' },
      { id: 'ing-3', name: 'Sertészsír vagy olaj', amount: 3, unit: 'ek' },
      { id: 'ing-4', name: 'Szegedi édes fűszerpaprika', amount: 2.5, unit: 'ek' },
      { id: 'ing-5', name: 'Fokhagyma zúzva', amount: 4, unit: 'gerezd' },
      { id: 'ing-6', name: 'Sárgarépa karikázva', amount: 3, unit: 'szál' },
      { id: 'ing-7', name: 'Fehérrépa (gyökér)', amount: 2, unit: 'szál' },
      { id: 'ing-8', name: 'Burgonya kockázva', amount: 600, unit: 'g' },
      { id: 'ing-9', name: 'Zellergumó és zellerzöld', amount: 100, unit: 'g' },
      { id: 'ing-10', name: 'Paradicsom és tv paprika', amount: 1, unit: 'db' },
      { id: 'ing-11', name: 'Őrölt kömény, só, bors', amount: 1, unit: 'tk' }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'A zsíron pirítsuk üvegesre az apróra vágott hagymát, majd húzzuk le a tűzről és keverjük el benne a fűszerpaprikát.',
        durationMinutes: 8
      },
      {
        stepNumber: 2,
        instruction: 'Tegyük hozzá a felkockázott marhahúst, a zúzott fokhagymát és az őrölt köményt. Pirítsuk fehéredésig, majd kevés vízzel fedő alatt pároljuk puhulásig (kb. 60 perc).',
        durationMinutes: 60
      },
      {
        stepNumber: 3,
        instruction: 'Amikor a hús már félpuha, adjuk hozzá a karikázott sárgarépát, fehérrépát, zellert és az egész paprikát/paradicsomot. Öntsük fel 2 liter vízzel.',
        durationMinutes: 20
      },
      {
        stepNumber: 4,
        instruction: 'Adjuk hozzá a felkockázott burgonyát és a csipetkét. Főzzük készre további 20 perc alatt, míg minden zöldség megpuhul. Kóstoljuk, ízesítsük sóval és friss petrezselyemmel.',
        durationMinutes: 20
      }
    ],
    notes: 'Ha van füstölt szalonna zsírunk, azzal még zamatosabb lesz a szaftja!'
  },
  {
    id: 'rec-2',
    title: 'Klasszikus Csirkepaprikás Vajas Nokedlivel',
    description: 'Selymes tejfölös paprikás mártásban párolt tanyasi csirkecombok, frissen szaggatott házi nokedlivel.',
    category: 'Főételek',
    chef: 'Anya',
    prepTimeMinutes: 20,
    cookTimeMinutes: 45,
    servings: 4,
    difficulty: 'Könnyű',
    tags: ['Magyaros', 'Szárnyas', 'Gyors', 'Családi'],
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isFavorite: true,
    likes: ['Anya', 'Apa', 'Krisi', 'Rolcsi', 'Brigi'],
    dislikes: [],
    createdAt: '2026-10-18',
    ingredients: [
      { id: 'ing-201', name: 'Csirkecomb (egész vagy alsó-felső)', amount: 1000, unit: 'g' },
      { id: 'ing-202', name: 'Vöröshagyma finomra vágva', amount: 2, unit: 'fej' },
      { id: 'ing-203', name: 'Kacsazsír vagy repceolaj', amount: 2, unit: 'ek' },
      { id: 'ing-204', name: 'Kalocsai fűszerpaprika', amount: 2, unit: 'ek' },
      { id: 'ing-205', name: 'Tejföl (20%-os)', amount: 250, unit: 'g' },
      { id: 'ing-206', name: 'Finomliszt', amount: 1, unit: 'púpos ek' },
      { id: 'ing-207', name: 'Nokedlihez: finomliszt', amount: 400, unit: 'g' },
      { id: 'ing-208', name: 'Nokedlihez: tojás', amount: 2, unit: 'db' },
      { id: 'ing-209', name: 'Só, bors, víz', amount: 1, unit: 'ízlés szerint' }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'A hagymát zsírban megpároljuk, megszórjuk paprikával, hozzáadjuk a sót, a borsot és a megtisztított csirkehúst.',
        durationMinutes: 10
      },
      {
        stepNumber: 2,
        instruction: 'Kevés vízzel felöntve, fedő alatt puhára pároljuk a combokat (kb. 30-35 perc).',
        durationMinutes: 35
      },
      {
        stepNumber: 3,
        instruction: 'A tejfölt elkeverjük a liszttel és kevés forró szafttal (hőkiegyenlítés), majd a csirkéhez csurgatjuk és összeforraljuk.',
        durationMinutes: 5
      },
      {
        stepNumber: 4,
        instruction: 'A nokedli alapanyagait lágy galuskatésztává keverjük, forrásban lévő sós vízbe szaggatjuk, és amint feljönnek a víz színére, vajra szedjük.',
        durationMinutes: 10
      }
    ]
  },
  {
    id: 'rec-3',
    title: 'Hagyományos Nagymama Palacsintája',
    description: 'Vékony, selymes házi palacsinta, házi baracklekvárral vagy kakaóval töltve.',
    category: 'Desszertek',
    chef: 'Krisi',
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servings: 4,
    difficulty: 'Könnyű',
    tags: ['Desszert', 'Gyerekek kedvence', 'Gyors'],
    imageUrl: 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?auto=format&fit=crop&w=800&q=80',
    videoUrl: '',
    isFavorite: true,
    likes: ['Anya', 'Apa', 'Krisi', 'Rolcsi', 'Mark', 'Brigi'],
    dislikes: [],
    createdAt: '2026-10-22',
    ingredients: [
      { id: 'ing-301', name: 'Finomliszt', amount: 200, unit: 'g' },
      { id: 'ing-302', name: 'Friss tojás', amount: 2, unit: 'db' },
      { id: 'ing-303', name: 'Tej', amount: 300, unit: 'ml' },
      { id: 'ing-304', name: 'Szódavíz vagy ásványvíz', amount: 200, unit: 'ml' },
      { id: 'ing-305', name: 'Étolaj a tésztába', amount: 2, unit: 'ek' },
      { id: 'ing-306', name: 'Csipet só, vaníliás cukor', amount: 1, unit: 'csipet' }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'A tojásokat a cukorral és csipet sóval elkeverjük. Fokozatosan hozzáadjuk a lisztet és a tejet, hogy csomómentes legyen.',
        durationMinutes: 5
      },
      {
        stepNumber: 2,
        instruction: 'Hozzáöntjük a szódavizet és az olajat, majd 20 percet pihentetjük a hűtőben.',
        durationMinutes: 20
      },
      {
        stepNumber: 3,
        instruction: 'Forró, vékonyan kiolajozott serpenyőben mindkét oldalát aranybarnára sütjük kb. 1-1 perc alatt.',
        durationMinutes: 15
      }
    ],
    notes: 'A tésztába kevert olaj miatt elég csak az első palacsinta előtt megkenni a serpenyőt.'
  },
  {
    id: 'rec-4',
    title: 'Kovászos Rusztikus Parasztkenyér',
    description: 'Ropogós héjú, buborékos belsejű kézműves kovászos kenyér, 24 órás hideg kelesztéssel.',
    category: 'Péksütemények',
    chef: 'Rolcsi',
    prepTimeMinutes: 40,
    cookTimeMinutes: 45,
    servings: 8,
    difficulty: 'Haladó',
    tags: ['Kenyér', 'Kovász', 'Artizán'],
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    videoUrl: '',
    isFavorite: false,
    likes: ['Apa', 'Rolcsi'],
    dislikes: [],
    createdAt: '2026-10-20',
    ingredients: [
      { id: 'ing-401', name: 'BL80 kenyérliszt', amount: 450, unit: 'g' },
      { id: 'ing-402', name: 'Teljes kiőrlésű rozsliszt', amount: 50, unit: 'g' },
      { id: 'ing-403', name: 'Langyos víz (75% hidratáció)', amount: 375, unit: 'ml' },
      { id: 'ing-404', name: 'Aktív kovász', amount: 100, unit: 'g' },
      { id: 'ing-405', name: 'Finom tengeri só', amount: 10, unit: 'g' }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Autolízis: A liszteket összekeverjük a vízzel, és 45 percig pihentetjük.',
        durationMinutes: 45
      },
      {
        stepNumber: 2,
        instruction: 'Hozzáadjuk a kovászt és a sót, majd 30 percenként négyszer hajtogatjuk (coil fold technika).',
        durationMinutes: 120
      },
      {
        stepNumber: 3,
        instruction: 'Megformázzuk a veknit, szakajtóba helyezzük, és hűtőben 14 órán át hidegen kelesztjük.',
        durationMinutes: 840
      },
      {
        stepNumber: 4,
        instruction: 'Öntöttvas edényben, 240°C-on fedő alatt 25 percig, majd fedő nélkül 220°C-on további 20 percig aranybarnára sütjük.',
        durationMinutes: 45
      }
    ]
  }
];
