import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChefHat,
  Search,
  Plus,
  Clock,
  Users,
  Flame,
  Heart,
  Printer,
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Edit3,
  Server,
  FileCode,
  FolderUp,
  Copy,
  ExternalLink,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Filter,
  Layers,
  ArrowUpDown,
  AlertCircle,
  ShoppingCart,
  ThumbsUp,
  ThumbsDown,
  Video,
  Maximize2,
  Minimize2,
  Share2,
  CheckCircle2,
  Sun,
  Volume2,
  Globe,
  Camera,
  FileText,
  Loader2,
  ChevronDown,
  Menu,
  HelpCircle
} from 'lucide-react';
import { Recipe, Ingredient, RecipeStep, ShoppingItem, FamilyMember } from './types';
import { initialRecipes, initialFamilyMembers } from './data/initialRecipes';
import { APP_VERSION, APP_BUILD_NAME } from './version';
import { UserGuideModal } from './components/UserGuideModal';

export default function App() {
  // Recipes State with LocalStorage
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('csaladi_receptek');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved recipes', e);
      }
    }
    return initialRecipes;
  });

  // Family Members State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('csaladi_tagok');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse family members', e);
      }
    }
    return initialFamilyMembers;
  });

  // Active Family Member (currently cooking or voting)
  const [currentMember, setCurrentMember] = useState<string>(() => {
    return localStorage.getItem('aktiv_csaladtag') || 'Anya';
  });

  // Shopping List State
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('csaladi_bevasarlolista');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse shopping list', e);
      }
    }
    return [
      { id: 'shop-1', name: 'Marhalábszár', amount: 800, unit: 'g', category: 'Hús & Hal', checked: false, recipeTitle: 'Gulyásleves' },
      { id: 'shop-2', name: 'Tejföl 20%', amount: 1, unit: 'pohár', category: 'Tejtermék', checked: false, recipeTitle: 'Csirkepaprikás' },
      { id: 'shop-3', name: 'BL80 Kenyérliszt', amount: 1, unit: 'kg', category: 'Kamra & Fűszerek', checked: true, recipeTitle: 'Kovászos kenyér' }
    ];
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<'katalogus' | 'fozomod' | 'bevasarlo' | 'csalad' | 'pi'>('katalogus');
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navDropdownRef = useRef<HTMLDivElement>(null);
  
  // Selected Recipe & Cooking Mode
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [cookingCurrentStep, setCookingCurrentStep] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Recipe Scaler & Checklists inside Modal
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Összes');
  const [selectedChef, setSelectedChef] = useState<string>('Mindenki');
  const [sortBy, setSortBy] = useState<'likes' | 'title' | 'time' | 'newest'>('likes');

  // Interactive Kitchen Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerRecipeName, setTimerRecipeName] = useState<string>('');

  // Editing & Creating Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});

  // Shopping List New Item Input
  const [newShopItem, setNewShopItem] = useState({ name: '', amount: '', unit: '', category: 'Egyéb' as const });

  // Raspberry Pi Sync & Inspector
  const [piServerIp, setPiServerIp] = useState('http://raspberrypi.local:5000');
  const [piTestStatus, setPiTestStatus] = useState<{ testing: boolean; message?: string }>({ testing: false });
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string; size: number; content?: string }>>([]);
  const [selectedPreviewPath, setSelectedPreviewPath] = useState<string | null>(null);

  // RecipeSage-style Smart Recipe Importer (URL, Text, Image, PDF)
  const [smartImporterOpen, setSmartImporterOpen] = useState(false);
  const [importType, setImportType] = useState<'url' | 'text' | 'image' | 'pdf'>('url');
  const [importUrl, setImportUrl] = useState('');
  const [importRawText, setImportRawText] = useState('');
  const [importFile, setImportFile] = useState<{ name: string; base64: string; mimeType: string; previewUrl?: string; sizeMb?: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // State for recipe delete confirmation modal
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  // State for User Guide / Documentation modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Dynamic custom categories state
  const defaultCategories = ['Főételek', 'Levesek', 'Desszertek', 'Péksütemények', 'Saláták'];
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('csaladi_kategoriak');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse categories', e);
      }
    }
    return defaultCategories;
  });
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [manageCategoryInput, setManageCategoryInput] = useState('');

  // Modern In-App Toast Notification (avoiding window.alert)
  const [toastMessage, setToastMessage] = useState<{ id: string; text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ id: String(Date.now()), text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur && cur.text === text ? null : cur));
    }, 4500);
  };

  const handleExtractRecipe = async () => {
    setIsExtracting(true);
    setExtractError(null);

    try {
      let payload: any = { type: importType };
      if (importType === 'url') {
        if (!importUrl.trim()) throw new Error('Kérlek adj meg egy érvényes recept URL-t!');
        payload.content = importUrl.trim();
      } else if (importType === 'text') {
        if (!importRawText.trim()) throw new Error('Kérlek illeszd be a recept szövegét!');
        payload.content = importRawText.trim();
      } else if (importType === 'image' || importType === 'pdf') {
        if (!importFile) throw new Error('Kérlek válassz ki egy fényképet vagy PDF fájlt!');
        payload.content = importFile.base64;
        payload.mimeType = importFile.mimeType;
      }

      let data: any;
      let res: Response | null = null;

      try {
        res = await fetch('/api/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const responseText = await res.text();
        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }
      } catch (networkErr: any) {
        console.warn('Backend extract request failed, checking client fallback:', networkErr.message);
      }

      // If backend returned 404 or failed and type is URL, attempt client-side fallback
      if ((!res || res.status === 404 || !data || !data.success) && importType === 'url') {
        const targetUrl = importUrl.trim();
        console.log(`[Client Fallback] Próbálkozás közvetlen kliensoldali beolvasással: ${targetUrl}`);
        
        const proxies = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
          `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
        ];

        let fetchedHtml = '';
        for (const proxyUrl of proxies) {
          try {
            const pRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
            if (pRes.ok) {
              const text = await pRes.text();
              if (text && text.length > 200) {
                fetchedHtml = text;
                break;
              }
            }
          } catch {}
        }

        if (fetchedHtml) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(fetchedHtml, 'text/html');
            const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
            
            for (const script of Array.from(scripts)) {
              try {
                const parsed = JSON.parse(script.textContent || '{}');
                const items = Array.isArray(parsed)
                  ? parsed
                  : (parsed['@graph'] && Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]);

                for (const item of items) {
                  const type = item['@type'];
                  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
                    const title = item.name || item.headline || doc.title || '';
                    const rawIngredients = item.recipeIngredient || item.ingredients || [];
                    const ingredients = Array.isArray(rawIngredients)
                      ? rawIngredients.map((ing: any, idx: number) => {
                          const ingStr = String(ing || '').trim();
                          const m = ingStr.match(/^([\d.,\/\s]+)\s*(kg|dkg|g|ml|dl|l|liter|ek|tk|kávéskanál|evőkanál|csipet|db|gerezd|fej|csomag|tasak|szem|bögre|pohár|szelet|marék)?\s*(.*)$/i);
                          if (m && m[3]) {
                            return {
                              id: `ing-${Date.now()}-${idx}`,
                              name: m[3].trim().replace(/^[-–—]\s*/, ''),
                              amount: parseFloat(m[1].replace(',', '.')) || 1,
                              unit: m[2] || 'db'
                            };
                          }
                          return {
                            id: `ing-${Date.now()}-${idx}`,
                            name: ingStr,
                            amount: 1,
                            unit: ingStr.toLowerCase().includes('ízlés szerint') ? 'ízlés szerint' : 'adag'
                          };
                        })
                      : [];

                    const rawSteps = item.recipeInstructions || [];
                    const stepTexts: string[] = [];
                    if (Array.isArray(rawSteps)) {
                      for (const s of rawSteps) {
                        if (typeof s === 'string') stepTexts.push(s);
                        else if (s && typeof s === 'object') {
                          if (s.itemListElement && Array.isArray(s.itemListElement)) {
                            s.itemListElement.forEach((el: any) => stepTexts.push(el.text || el.name || ''));
                          } else {
                            stepTexts.push(s.text || s.name || s.description || '');
                          }
                        }
                      }
                    } else if (typeof rawSteps === 'string') {
                      stepTexts.push(...rawSteps.split(/\n+/));
                    }

                    const steps = stepTexts.filter(Boolean).map((st, idx) => ({
                      stepNumber: idx + 1,
                      instruction: st.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                    }));

                    let imageUrl = '';
                    if (typeof item.image === 'string') imageUrl = item.image;
                    else if (Array.isArray(item.image) && item.image.length > 0) imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || '';

                    if (title) {
                      data = {
                        success: true,
                        recipe: {
                          title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                          category: 'Főételek',
                          description: item.description || '',
                          prepTimeMinutes: 15,
                          cookTimeMinutes: 30,
                          servings: 4,
                          difficulty: 'Könnyű',
                          tags: ['Weboldalról', 'Családi'],
                          ingredients: ingredients.length > 0 ? ingredients : [{ id: `ing-1`, name: 'Alapanyagok', amount: 1, unit: 'adag' }],
                          steps: steps.length > 0 ? steps : [{ stepNumber: 1, instruction: 'Lásd a recept eredeti oldalát.' }],
                          notes: `Forrás: ${targetUrl}`,
                          imageUrl
                        },
                        extractedImages: imageUrl ? [imageUrl] : []
                      };
                      break;
                    }
                  }
                }
                if (data && data.success) break;
              } catch {}
            }
          } catch (domErr) {
            console.warn('DOMParser fallback warning:', domErr);
          }
        }
      }

      // If still no valid data, check text fallback or throw friendly error
      if (!data || !data.success) {
        if (importType === 'text' && importRawText.trim()) {
          const lines = importRawText.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          data = {
            success: true,
            recipe: {
              title: lines[0] || 'Beillesztett recept',
              category: 'Főételek',
              description: '',
              prepTimeMinutes: 15,
              cookTimeMinutes: 30,
              servings: 4,
              difficulty: 'Könnyű',
              tags: ['Szövegből'],
              ingredients: [{ id: `ing-1`, name: 'Összetevők a leírásban', amount: 1, unit: 'adag' }],
              steps: lines.slice(1).map((l, i) => ({ stepNumber: i + 1, instruction: l })),
              imageUrl: ''
            },
            extractedImages: []
          };
        } else {
          const errStatus = res ? res.status : 0;
          if (errStatus === 404) {
            throw new Error('A szerver háttérfolyamata nem elérhető (HTTP 404). Kérjük a Raspberry Pi-n futtasd az "npm run build" majd "npm start" parancsot, vagy másold be közvetlenül a szöveget a "Szöveg" fülön!');
          }
          throw new Error(data?.error || `A recept feldolgozása sikertelen volt (Kód: ${errStatus || 'hálózati hiba'}).`);
        }
      }

      const ext = data.recipe;
      const extractedPhoto =
        importType === 'pdf'
          ? ''
          : (ext.imageUrl || (data.extractedImages && data.extractedImages[0]) || (importType === 'image' && importFile ? importFile.base64 : ''));

      setEditForm({
        id: `rec-${Date.now()}`,
        title: ext.title || 'Beolvasott recept',
        category: ext.category || 'Főételek',
        chef: currentMember,
        description: ext.description || '',
        prepTimeMinutes: ext.prepTimeMinutes || 15,
        cookTimeMinutes: ext.cookTimeMinutes || 30,
        servings: ext.servings || 4,
        difficulty: ext.difficulty || 'Közepes',
        tags: ext.tags || ['Beolvasott', 'Családi'],
        ingredients: ext.ingredients || [],
        steps: ext.steps || [],
        notes: ext.notes || (importType === 'url' ? `Forrás: ${importUrl}` : ''),
        imageUrl: extractedPhoto || '',
        videoUrl: ext.videoUrl || '',
        likes: [currentMember],
        dislikes: [],
        createdAt: new Date().toISOString().split('T')[0]
      });

      if (importType === 'pdf') {
        showToast('✨ Recept adatai (hozzávalók, lépések) sikeresen kinyerve a PDF-ből! Képet manuálisan tölthetsz fel a szerkesztőben.', 'success');
      } else {
        showToast('✨ Recept sikeresen kinyerve és betöltve a szerkesztőbe!', 'success');
      }

      setSmartImporterOpen(false);
      setIsEditing(true);
    } catch (err: any) {
      setExtractError(err.message || 'Hiba történt a recept kinyerése közben.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSmartFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMb = file.size / (1024 * 1024);
    if (sizeInMb > 20) {
      setExtractError(`A kiválasztott fájl túl nagy (${sizeInMb.toFixed(1)} MB). Kérjük válassz 18 MB alatti PDF-et vagy képet!`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      setImportFile({
        name: file.name,
        base64: result,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        previewUrl: isPdf ? undefined : result,
        sizeMb: sizeInMb.toFixed(1)
      });
      setExtractError(null);
    };
    reader.readAsDataURL(file);
  };

  // Audio Beep for Timer Completion
  const playTimerChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.3); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            playTimerChime();
            showToast(`⏱️ Időzítő lejárt: ${timerRecipeName || 'A recept lépése elkészült!'}`, 'warning');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds, timerRecipeName]);

  // Screen Wake Lock in Cooking Mode
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && activeTab === 'fozomod') {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } catch (err) {
          console.log('WakeLock not granted', err);
        }
      }
    };

    if (activeTab === 'fozomod') {
      requestWakeLock();
    } else {
      if (wakeLockSentinel) {
        wakeLockSentinel.release();
        setWakeLockActive(false);
      }
    }

    return () => {
      if (wakeLockSentinel) wakeLockSentinel.release();
    };
  }, [activeTab]);

  // Click outside to close navigation dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setNavMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // LocalStorage Sync
  useEffect(() => {
    localStorage.setItem('csaladi_receptek', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('csaladi_tagok', JSON.stringify(familyMembers));
  }, [familyMembers]);

  useEffect(() => {
    localStorage.setItem('csaladi_bevasarlolista', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('aktiv_csaladtag', currentMember);
  }, [currentMember]);

  useEffect(() => {
    localStorage.setItem('csaladi_kategoriak', JSON.stringify(customCategories));
  }, [customCategories]);

  // Combined list of all available categories
  const allCategories = useMemo(() => {
    const set = new Set([...customCategories, ...recipes.map((r) => r.category).filter(Boolean)]);
    return Array.from(set);
  }, [customCategories, recipes]);

  // Categories list with 'Összes' for catalog filter bar
  const categories = useMemo(() => {
    return ['Összes', ...allCategories];
  }, [allCategories]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter((r) => {
        const matchesCategory = selectedCategory === 'Összes' || r.category === selectedCategory;
        const matchesChef = selectedChef === 'Mindenki' || r.chef === selectedChef;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.chef && r.chef.toLowerCase().includes(q)) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q));

        return matchesCategory && matchesChef && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') {
          const aLikes = a.likes?.length || 0;
          const bLikes = b.likes?.length || 0;
          return bLikes - aLikes;
        }
        if (sortBy === 'time') {
          return a.prepTimeMinutes + a.cookTimeMinutes - (b.prepTimeMinutes + b.cookTimeMinutes);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title, 'hu');
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [recipes, selectedCategory, selectedChef, searchQuery, sortBy]);

  // Start Kitchen Timer
  const startTimerForMinutes = (mins: number, title?: string) => {
    setTimerSeconds(mins * 60);
    setTimerRecipeName(title || '');
    setTimerRunning(true);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // YouTube Embed Formatter
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // Family Voting
  const handleVote = (recipeId: string, isLike: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const voter = currentMember;

    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const currentLikes = r.likes || [];
        const currentDislikes = r.dislikes || [];

        let newLikes = currentLikes.filter((n) => n !== voter);
        let newDislikes = currentDislikes.filter((n) => n !== voter);

        if (isLike) {
          // If already liked, remove like (toggle)
          if (!currentLikes.includes(voter)) {
            newLikes.push(voter);
          }
        } else {
          // If already disliked, remove dislike (toggle)
          if (!currentDislikes.includes(voter)) {
            newDislikes.push(voter);
          }
        }

        const updated = { ...r, likes: newLikes, dislikes: newDislikes };
        if (selectedRecipe && selectedRecipe.id === recipeId) {
          setSelectedRecipe(updated);
        }
        if (cookingRecipe && cookingRecipe.id === recipeId) {
          setCookingRecipe(updated);
        }
        return updated;
      })
    );
  };

  // Add Recipe ingredients to Shopping List
  const addIngredientsToShoppingList = (recipe: Recipe) => {
    const newItems: ShoppingItem[] = recipe.ingredients.map((ing) => {
      // Determine category based on ingredient name
      const name = ing.name.toLowerCase();
      let cat: ShoppingItem['category'] = 'Egyéb';
      if (name.includes('hús') || name.includes('csirke') || name.includes('marha') || name.includes('sertés') || name.includes('hal')) {
        cat = 'Hús & Hal';
      } else if (name.includes('hagyma') || name.includes('répa') || name.includes('burgonya') || name.includes('krumpli') || name.includes('fokhagyma') || name.includes('zeller') || name.includes('paprika') || name.includes('paradicsom')) {
        cat = 'Zöldség & Gyümölcs';
      } else if (name.includes('tej') || name.includes('tejföl') || name.includes('sajt') || name.includes('vaj') || name.includes('túró')) {
        cat = 'Tejtermék';
      } else if (name.includes('liszt') || name.includes('só') || name.includes('cukor') || name.includes('olaj') || name.includes('zsír') || name.includes('kömény') || name.includes('bors')) {
        cat = 'Kamra & Fűszerek';
      } else if (name.includes('kenyér') || name.includes('zsemle') || name.includes('kifli')) {
        cat = 'Pékáru';
      }

      return {
        id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: ing.name,
        amount: Math.round(ing.amount * servingsMultiplier * 10) / 10,
        unit: ing.unit,
        category: cat,
        checked: false,
        recipeTitle: recipe.title,
        addedBy: currentMember
      };
    });

    setShoppingList((prev) => [...newItems, ...prev]);
    showToast(`🎉 ${newItems.length} db hozzávaló hozzáadva a Családi Bevásárlólistához!`, 'success');
  };

  // Shopping list toggle
  const toggleShoppingItem = (id: string) => {
    setShoppingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const deleteShoppingItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const requestDeleteRecipe = (idOrRecipe: string | Recipe) => {
    if (typeof idOrRecipe === 'string') {
      const found = recipes.find((r) => r.id === idOrRecipe);
      if (found) {
        setRecipeToDelete(found);
      }
    } else {
      setRecipeToDelete(idOrRecipe);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    requestDeleteRecipe(id);
  };

  const confirmDeleteRecipe = () => {
    if (!recipeToDelete) return;
    const id = recipeToDelete.id;
    const title = recipeToDelete.title;

    setRecipes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('csaladi_receptek', JSON.stringify(updated));
      } catch (e) {
        console.error('LocalStorage save error:', e);
      }
      return updated;
    });

    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(null);
    }
    if (cookingRecipe && cookingRecipe.id === id) {
      setCookingRecipe(null);
    }
    if (isEditing && editForm && editForm.id === id) {
      setIsEditing(false);
      setEditForm({});
    }

    setRecipeToDelete(null);
    showToast(`🗑️ A(z) "${title}" recept sikeresen törölve!`, 'info');
  };

  const handleAddManualShoppingItem = () => {
    if (!newShopItem.name.trim()) return;
    const item: ShoppingItem = {
      id: `shop-${Date.now()}`,
      name: newShopItem.name.trim(),
      amount: newShopItem.amount ? Number(newShopItem.amount) || newShopItem.amount : undefined,
      unit: newShopItem.unit.trim() || undefined,
      category: newShopItem.category,
      checked: false,
      addedBy: currentMember
    };
    setShoppingList((prev) => [item, ...prev]);
    setNewShopItem({ name: '', amount: '', unit: '', category: 'Egyéb' });
  };

  const copyShoppingListToClipboard = () => {
    const grouped: Record<string, ShoppingItem[]> = {};
    shoppingList.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    let text = `🛒 CSALÁDI BEVÁSÁRLÓLISTA (${new Date().toLocaleDateString('hu-HU')})\n\n`;
    Object.entries(grouped).forEach(([cat, items]) => {
      text += `--- ${cat.toUpperCase()} ---\n`;
      items.forEach((it) => {
        text += `${it.checked ? '✅' : '⬜'} ${it.name} ${it.amount ? `${it.amount} ${it.unit || ''}` : ''}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    showToast('📋 A bevásárlólista a vágólapra másolva! Könnyen elküldheted WhatsAppon vagy SMS-ben.', 'info');
  };

  // Start Cooking Mode for a recipe
  const launchCookingMode = (recipe: Recipe) => {
    setCookingRecipe(recipe);
    setCookingCurrentStep(0);
    setActiveTab('fozomod');
    setSelectedRecipe(null);
  };

  // Test Raspberry Pi REST API
  const testRaspberryPi = async () => {
    setPiTestStatus({ testing: true });
    try {
      const res = await fetch(`${piServerIp}/api/recipes`, {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        setPiTestStatus({
          testing: false,
          message: `✅ Sikeres kapcsolat a Raspberry Pi-vel! (${Array.isArray(data) ? data.length : 0} db recept elérve)`
        });
      } else {
        setPiTestStatus({
          testing: false,
          message: `⚠️ A szerver válaszolt (${res.status}), de ellenőrizd az útvonalat.`
        });
      }
    } catch (err: any) {
      setPiTestStatus({
        testing: false,
        message: `ℹ️ Nem sikerült közvetlenül elérni a Pi-t a böngészőből (${err.name === 'TimeoutError' ? 'Időtúllépés' : 'Helyi hálózati / CORS korlát'}). Ez normális. Másold be vagy töltsd le a szkripteket lejjebb!`
      });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Brand title */}
          <div
            onClick={() => {
              setActiveTab('katalogus');
              setNavMenuOpen(false);
            }}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap leading-none">
                  Családi Receptkönyv
                </span>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold bg-amber-100 text-amber-900 rounded-md border border-amber-300/80 leading-none shadow-2xs">
                  {APP_VERSION}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium">{APP_BUILD_NAME}</span>
            </div>
          </div>

          {/* Zone 2: Space-Saving Navigation / Dropdown Menu */}
          <div className="relative" ref={navDropdownRef}>
            <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/80">
              {/* Primary Direct Tab: Recepttár */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('katalogus');
                  setNavMenuOpen(false);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'katalogus'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Recepttár</span>
                <span className="px-1.5 py-0.2 bg-stone-200 text-stone-700 text-[10px] rounded-full font-bold tabular-nums">
                  {recipes.length}
                </span>
              </button>

              {/* Dropdown Menu Trigger for Secondary Modes */}
              <button
                type="button"
                onClick={() => setNavMenuOpen(!navMenuOpen)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab !== 'katalogus'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title="Konyhai menü és további funkciók"
              >
                {activeTab === 'fozomod' ? (
                  <Flame className="w-4 h-4 text-amber-200 shrink-0" />
                ) : activeTab === 'bevasarlo' ? (
                  <ShoppingCart className="w-4 h-4 text-amber-200 shrink-0" />
                ) : activeTab === 'csalad' ? (
                  <Users className="w-4 h-4 text-amber-200 shrink-0" />
                ) : activeTab === 'pi' ? (
                  <Server className="w-4 h-4 text-amber-200 shrink-0" />
                ) : (
                  <Menu className="w-4 h-4 text-stone-500 shrink-0" />
                )}

                <span className="max-w-[90px] sm:max-w-none truncate">
                  {activeTab === 'katalogus'
                    ? 'Menü'
                    : activeTab === 'fozomod'
                    ? 'Főzőmód'
                    : activeTab === 'bevasarlo'
                    ? `Bevásárlás (${shoppingList.filter((i) => !i.checked).length})`
                    : activeTab === 'csalad'
                    ? 'Családtagok'
                    : 'Pi Hub'}
                </span>

                {/* Badge if unchecked shopping items exist while on another tab */}
                {activeTab === 'katalogus' && shoppingList.some((i) => !i.checked) && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                )}

                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    navMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Dropdown Card */}
            {navMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Konyhai Menüpontok
                </div>

                <div className="space-y-0.5 px-1.5">
                  {/* Option 1: Recepttár */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('katalogus');
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === 'katalogus'
                        ? 'bg-amber-50 text-amber-950 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Recepttár</div>
                        <div className="text-[11px] text-stone-500 font-normal">Összes családi recept és kereső</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full shrink-0">
                      {recipes.length} db
                    </span>
                  </button>

                  {/* Option 2: Konyhai Főzőmód */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!cookingRecipe && recipes.length > 0) setCookingRecipe(recipes[0]);
                      setActiveTab('fozomod');
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === 'fozomod'
                        ? 'bg-amber-50 text-amber-950 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Konyhai Főzőmód</div>
                        <div className="text-[11px] text-stone-500 font-normal">Fókuszált lépések & időzítő</div>
                      </div>
                    </div>
                    {cookingRecipe && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full truncate max-w-[80px] shrink-0">
                        Aktív
                      </span>
                    )}
                  </button>

                  {/* Option 3: Bevásárlólista */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('bevasarlo');
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === 'bevasarlo'
                        ? 'bg-amber-50 text-amber-950 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Bevásárlólista</div>
                        <div className="text-[11px] text-stone-500 font-normal">Hozzávalók és pipálható lista</div>
                      </div>
                    </div>
                    {shoppingList.filter((i) => !i.checked).length > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
                        {shoppingList.filter((i) => !i.checked).length} db
                      </span>
                    )}
                  </button>

                  {/* Option 4: Családtagok */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('csalad');
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === 'csalad'
                        ? 'bg-amber-50 text-amber-950 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Családtagok & Ízlések</div>
                        <div className="text-[11px] text-stone-500 font-normal">Kedvencek és szavazatok</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-full shrink-0">
                      {familyMembers.length} fő
                    </span>
                  </button>

                  {/* Option 5: Raspberry Pi Hub */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('pi');
                      setNavMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === 'pi'
                        ? 'bg-amber-50 text-amber-950 font-semibold'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Raspberry Pi Hub</div>
                        <div className="text-[11px] text-stone-500 font-normal">Helyi hálózati szinkronizáció & mentés</div>
                      </div>
                    </div>
                  </button>

                  {/* Option 6: Felhasználói Útmutató & Segítség */}
                  <div className="pt-1 mt-1 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpOpen(true);
                        setNavMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer text-stone-700 hover:bg-amber-50 hover:text-amber-950"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                            <span>Felhasználói Útmutató</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 font-bold rounded-md">
                              Kézikönyv
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 font-normal">Kézikönyv, tippek & GYIK</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone 3: Active Member Selector, Help Guide & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Active User Dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-stone-100 rounded-xl px-2.5 py-1.5 text-xs border border-stone-200">
              <span className="text-stone-500 hidden sm:inline">Szakács:</span>
              <select
                value={currentMember}
                onChange={(e) => setCurrentMember(e.target.value)}
                className="bg-transparent font-semibold text-stone-800 border-none focus:outline-none cursor-pointer text-xs"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* User Guide / Manual Button */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="px-2.5 sm:px-3 py-2 text-xs font-semibold text-stone-700 hover:text-teal-900 bg-stone-100 hover:bg-teal-50 border border-stone-200/90 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Részletes Felhasználói Kézikönyv & Segítség"
            >
              <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="hidden sm:inline">Útmutató</span>
            </button>

            {/* New Recipe Action */}
            <button
              onClick={() => {
                setEditForm({
                  id: `rec-${Date.now()}`,
                  title: '',
                  description: '',
                  category: 'Főételek',
                  chef: currentMember,
                  prepTimeMinutes: 15,
                  cookTimeMinutes: 30,
                  servings: 4,
                  difficulty: 'Könnyű',
                  tags: ['Családi'],
                  ingredients: [{ id: 'ing-1', name: '', amount: 100, unit: 'g' }],
                  steps: [{ stepNumber: 1, instruction: '', durationMinutes: 10 }],
                  likes: [currentMember],
                  dislikes: [],
                  createdAt: new Date().toISOString().split('T')[0]
                });
                setIsEditing(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Új Recept</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Kitchen Timer Banner */}
      {timerSeconds > 0 && (
        <div className="bg-stone-900 text-white px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between shadow-md sticky top-16 z-30">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-semibold text-stone-200">Konyhai Időzítő:</span>
              <span className="font-mono text-base font-bold text-amber-300 tabular-nums">
                {formatTimer(timerSeconds)}
              </span>
              {timerRecipeName && <span className="text-stone-400 text-xs hidden sm:inline">({timerRecipeName})</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs transition-colors cursor-pointer"
              >
                {timerRunning ? 'Szünet' : 'Folytatás'}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded text-xs transition-colors cursor-pointer"
              >
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ========================================================================= */}
        {/* TAB 1: RECEPTTÁR (KATALÓGUS) */}
        {/* ========================================================================= */}
        {activeTab === 'katalogus' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Keresés ételnév, hozzávaló (pl. marha, tejföl) vagy szakács szerint..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Chef Filter & Sorting */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Chef selector */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <ChefHat className="w-3.5 h-3.5 text-stone-500" />
                    <select
                      value={selectedChef}
                      onChange={(e) => setSelectedChef(e.target.value)}
                      className="bg-transparent font-medium text-stone-800 border-none focus:outline-none cursor-pointer"
                    >
                      <option value="Mindenki">👨‍🍳 Minden szakács receptje</option>
                      {familyMembers.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} receptjei
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort selector */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                    <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="bg-transparent font-medium text-stone-800 border-none focus:outline-none cursor-pointer"
                    >
                      <option value="likes">🔥 Családi kedvencek (Lájkok)</option>
                      <option value="title">🔤 Név szerint (ABC)</option>
                      <option value="time">⏱️ Leggyorsabb elkészítés</option>
                      <option value="newest">📅 Legújabbak</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Category buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setManageCategoryInput('');
                    setIsCategoryManageOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                  title="Új kategóriák hozzáadása és kezelése"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>+ Kategória</span>
                </button>
              </div>
            </div>

            {/* Sub-header info */}
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <div>
                <span>{filteredRecipes.length} db recept található</span>
                {selectedCategory !== 'Összes' && <span> · {selectedCategory}</span>}
                {selectedChef !== 'Mindenki' && <span> · {selectedChef} receptjei</span>}
              </div>
              <div className="flex items-center gap-2">
                <span>Aktív szavazóként bejelentkezve:</span>
                <span className="font-semibold text-stone-800">{currentMember}</span>
              </div>
            </div>

            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => {
                const isLikedByMe = recipe.likes?.includes(currentMember);
                const isDislikedByMe = recipe.dislikes?.includes(currentMember);
                const totalLikes = recipe.likes?.length || 0;

                return (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setServingsMultiplier(1);
                      setCheckedIngredients({});
                      setCompletedSteps({});
                    }}
                    className="group bg-white rounded-2xl border border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                  >
                    {/* Image / Video Header */}
                    <div className="relative h-48 bg-stone-100 overflow-hidden">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-amber-50 to-stone-100 p-4 text-center">
                          <ChefHat className="w-10 h-10 text-amber-500/40 mb-2" />
                          <span className="text-xs font-medium text-stone-400">{recipe.category}</span>
                        </div>
                      )}

                      {/* Video indicator badge */}
                      {recipe.videoUrl && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-red-600/90 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                          <Video className="w-3 h-3" />
                          <span>Videó</span>
                        </div>
                      )}

                      {/* Category Tag */}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-stone-900/80 backdrop-blur-xs text-white text-xs font-medium rounded-md">
                        {recipe.category}
                      </div>

                      {/* Top-Right Badges: Quick Delete + Thumbs Up Likes Counter */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteRecipe(recipe);
                          }}
                          className="p-1.5 bg-white/95 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-full shadow-xs transition-colors cursor-pointer"
                          title="Recept törlése"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-full text-xs font-bold shadow-xs">
                          <ThumbsUp className={`w-3.5 h-3.5 ${isLikedByMe ? 'text-emerald-600 fill-emerald-600' : 'text-stone-400'}`} />
                          <span className="text-stone-700 tabular-nums">{totalLikes}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                          <span className="font-medium text-amber-700">
                            👨‍🍳 Szakács: {recipe.chef || 'Admin'}
                          </span>
                        </div>
                        <h3 className="font-bold text-stone-900 group-hover:text-amber-700 transition-colors text-base line-clamp-1">
                          {recipe.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {recipe.description}
                        </p>
                      </div>

                      {/* Family voting members tags */}
                      {recipe.likes && recipe.likes.length > 0 && (
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                          <span className="text-emerald-600 font-semibold">Ízlik:</span>
                          <span className="truncate">{recipe.likes.join(', ')}</span>
                        </div>
                      )}

                      {/* Footer metadata */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes}p</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          <span>{recipe.servings} adag</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>{recipe.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KONYHAI FŐZŐMÓD (COOKING MODE) */}
        {/* ========================================================================= */}
        {activeTab === 'fozomod' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Cooking Mode Bar */}
            <div className="bg-stone-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Konyhai Főzőmód</span>
                    {wakeLockActive && (
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sun className="w-3 h-3" />
                        <span>Képernyő ébren tartva</span>
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-stone-400">
                    Nagybetűs nézet, lépésenkénti haladás és időzítők főzéshez.
                  </p>
                </div>
              </div>

              {/* Recipe Selector for Cooking */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={cookingRecipe?.id || ''}
                  onChange={(e) => {
                    const r = recipes.find((x) => x.id === e.target.value);
                    if (r) {
                      setCookingRecipe(r);
                      setCookingCurrentStep(0);
                    }
                  }}
                  className="bg-stone-800 text-white text-xs font-medium px-3 py-2 rounded-lg border border-stone-700 focus:outline-none w-full sm:w-64"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cookingRecipe ? (
              <div className="space-y-6">
                {/* Recipe Title & Overview */}
                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                        {cookingRecipe.category}
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                        {cookingRecipe.title}
                      </h1>
                      <div className="text-xs text-stone-500 mt-1">
                        Szakács: <strong>{cookingRecipe.chef || 'Admin'}</strong> · {cookingRecipe.servings} adag
                      </div>
                    </div>

                    <button
                      onClick={() => addIngredientsToShoppingList(cookingRecipe)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 text-amber-600" />
                      <span className="hidden sm:inline">Hozzávalók a listára</span>
                    </button>
                  </div>

                  {/* YouTube Embed Video if available */}
                  {cookingRecipe.videoUrl && getEmbedUrl(cookingRecipe.videoUrl) && (
                    <div className="mt-4 rounded-xl overflow-hidden aspect-video border border-stone-200 shadow-xs">
                      <iframe
                        src={getEmbedUrl(cookingRecipe.videoUrl)!}
                        title={cookingRecipe.title}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>

                {/* Step-by-Step Focus Navigator */}
                {cookingRecipe.steps && cookingRecipe.steps.length > 0 && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-md space-y-6">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                          {cookingCurrentStep + 1}. LÉPÉS / {cookingRecipe.steps.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cookingRecipe.steps.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCookingCurrentStep(idx)}
                            className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                              cookingCurrentStep === idx
                                ? 'bg-amber-600 scale-125'
                                : 'bg-stone-200 hover:bg-stone-300'
                            }`}
                            title={`${idx + 1}. lépés`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Giant Step Instruction text for easy reading from across the kitchen counter */}
                    <div className="py-4 min-h-[140px] flex items-center">
                      <p className="text-xl sm:text-2xl md:text-3xl font-medium text-stone-800 leading-relaxed">
                        {cookingRecipe.steps[cookingCurrentStep]?.instruction}
                      </p>
                    </div>

                    {/* Step Action Bar: Timer button & Navigation */}
                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-stone-100">
                      <div>
                        {cookingRecipe.steps[cookingCurrentStep]?.durationMinutes ? (
                          <button
                            onClick={() =>
                              startTimerForMinutes(
                                cookingRecipe.steps[cookingCurrentStep].durationMinutes!,
                                `${cookingRecipe.title} - ${cookingCurrentStep + 1}. lépés`
                              )
                            }
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>
                              Időzítő: {cookingRecipe.steps[cookingCurrentStep].durationMinutes} perc
                            </span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startTimerForMinutes(5, '5 perces időzítő')}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg"
                            >
                              +5 perc
                            </button>
                            <button
                              onClick={() => startTimerForMinutes(15, '15 perces időzítő')}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg"
                            >
                              +15 perc
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          disabled={cookingCurrentStep === 0}
                          onClick={() => setCookingCurrentStep((p) => Math.max(0, p - 1))}
                          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-800 font-semibold text-sm rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Előző</span>
                        </button>

                        <button
                          disabled={cookingCurrentStep === cookingRecipe.steps.length - 1}
                          onClick={() =>
                            setCookingCurrentStep((p) => Math.min(cookingRecipe.steps.length - 1, p + 1))
                          }
                          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Következő lépés</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ingredients Quick Checklist at bottom */}
                <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                  <h3 className="font-bold text-stone-900 text-base">Hozzávalók ellenőrzése</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cookingRecipe.ingredients.map((ing) => {
                      const isDone = !!checkedIngredients[ing.id];
                      return (
                        <div
                          key={ing.id}
                          onClick={() =>
                            setCheckedIngredients((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))
                          }
                          className={`p-3 rounded-xl border text-sm flex items-center justify-between cursor-pointer transition-colors ${
                            isDone ? 'bg-stone-50 border-stone-200 text-stone-400 line-through' : 'bg-white border-stone-200 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300 shrink-0" />
                            )}
                            <span>{ing.name}</span>
                          </div>
                          <span className="font-semibold text-xs tabular-nums text-stone-600">
                            {ing.amount} {ing.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
                <Flame className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900">Válassz egy receptet a főzéshez</h3>
                <p className="text-xs text-stone-500">
                  A recepttárból bármelyik receptkártyán a „Főzés indítása” gombra kattintva ide jutsz.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CSALÁDI BEVÁSÁRLÓLISTA (SHOPPING LIST) */}
        {/* ========================================================================= */}
        {activeTab === 'bevasarlo' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-amber-600" />
                    <span>Családi Bevásárlólista</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Receptekből generált és kézzel hozzáadott tételek, boltban pipálható formában.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyShoppingListToClipboard}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Másolás (WhatsApp / SMS)</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Törlöd az összes kipipált tételt a listáról?')) {
                        setShoppingList((prev) => prev.filter((i) => !i.checked));
                      }
                    }}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Kipipáltak törlése
                  </button>
                </div>
              </div>

              {/* Add item row */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Új tétel (pl. Tej, Vaj, Étolaj...)"
                  value={newShopItem.name}
                  onChange={(e) => setNewShopItem({ ...newShopItem, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddManualShoppingItem()}
                  className="flex-2 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <input
                  type="text"
                  placeholder="Mennyiség (pl. 2)"
                  value={newShopItem.amount}
                  onChange={(e) => setNewShopItem({ ...newShopItem, amount: e.target.value })}
                  className="w-24 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Egység (db, l, kg)"
                  value={newShopItem.unit}
                  onChange={(e) => setNewShopItem({ ...newShopItem, unit: e.target.value })}
                  className="w-24 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />
                <select
                  value={newShopItem.category}
                  onChange={(e: any) => setNewShopItem({ ...newShopItem, category: e.target.value })}
                  className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="Zöldség & Gyümölcs">Zöldség & Gyümölcs</option>
                  <option value="Hús & Hal">Hús & Hal</option>
                  <option value="Tejtermék">Tejtermék</option>
                  <option value="Kamra & Fűszerek">Kamra & Fűszerek</option>
                  <option value="Pékáru">Pékáru</option>
                  <option value="Egyéb">Egyéb</option>
                </select>
                <button
                  onClick={handleAddManualShoppingItem}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Hozzáadás
                </button>
              </div>
            </div>

            {/* Grouped Shopping List */}
            {shoppingList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
                <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">A bevásárlólista üres</h3>
                <p className="text-xs text-stone-500">
                  Nyiss meg bármelyik receptet a katalógusban, és kattints a „Hozzávalók küldése a Bevásárlólistára” gombra!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {['Zöldség & Gyümölcs', 'Hús & Hal', 'Tejtermék', 'Kamra & Fűszerek', 'Pékáru', 'Egyéb'].map((cat) => {
                  const itemsInCat = shoppingList.filter((it) => it.category === cat);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                      <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-xs font-bold text-stone-700">
                        <span>{cat}</span>
                        <span className="text-stone-400 font-normal">
                          {itemsInCat.filter((i) => i.checked).length} / {itemsInCat.length} beszerezve
                        </span>
                      </div>
                      <div className="divide-y divide-stone-100">
                        {itemsInCat.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => toggleShoppingItem(item.id)}
                            className={`px-5 py-3.5 flex items-center justify-between text-sm cursor-pointer hover:bg-stone-50 transition-colors ${
                              item.checked ? 'bg-stone-50/70 text-stone-400 line-through' : 'text-stone-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {item.checked ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-stone-300 shrink-0" />
                              )}
                              <span className="font-medium">{item.name}</span>
                              {item.recipeTitle && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 hidden sm:inline">
                                  {item.recipeTitle}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-semibold tabular-nums text-stone-600">
                                {item.amount ? `${item.amount} ${item.unit || ''}` : ''}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteShoppingItem(item.id);
                                }}
                                className="text-stone-300 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CSALÁDTAGOK & SZAVAZÁSOK (FAMILY HUB) */}
        {/* ========================================================================= */}
        {activeTab === 'csalad' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Family Members Header */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-amber-600" />
                    <span>Családtagok és Kedvencek</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Itt látható, hogy a családtagoknak mely receptek ízlettek, és könnyen válthatsz a fiókok között.
                  </p>
                </div>
              </div>

              {/* Members Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                {familyMembers.map((member) => {
                  const isCurrent = currentMember === member.name;
                  const likesCount = recipes.filter((r) => r.likes?.includes(member.name)).length;

                  return (
                    <div
                      key={member.id}
                      onClick={() => setCurrentMember(member.name)}
                      className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-50/50 shadow-xs scale-105'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold text-lg mb-2 shadow-xs ${
                          member.avatarColor || 'bg-amber-600'
                        }`}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="font-bold text-sm text-stone-900">{member.name}</div>
                      <div className="text-[11px] text-stone-500">{member.role}</div>
                      <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block font-semibold">
                        {likesCount} kedvenc
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Loved by Active Member List */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>{currentMember} kedvenc receptjei:</span>
              </h3>

              {recipes.filter((r) => r.likes?.includes(currentMember)).length === 0 ? (
                <p className="text-xs text-stone-400 italic">
                  Még nincs megjelölve kedvenc recept erre a családtagra. A receptkártyákon a 👍 (Ízlik) gombra kattintva adhatsz hozzá!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recipes
                    .filter((r) => r.likes?.includes(currentMember))
                    .map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecipe(r)}
                        className="p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-stone-900 text-sm">{r.title}</div>
                          <div className="text-[11px] text-stone-500">
                            {r.category} · Szakács: {r.chef || 'Admin'}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: RASPBERRY PI HUB & PROJEKT FÁJLOK */}
        {/* ========================================================================= */}
        {activeTab === 'pi' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top overview card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                  <Server className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-stone-900">
                      Raspberry Pi Projekt és Szerverfájlok
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                      {APP_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    A szerverfájlokat teljesen összevontuk és modernizáltuk! A korábbi 6 különálló SQL és frissítő szkript helyett most egyetlen tiszta <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800">database.py</code> és egy kibővített REST API-s <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-800">app.py</code> áll rendelkezésedre.
                  </p>
                </div>
              </div>

              {/* Status & Download of New Server Files */}
              <div className="pt-2 border-t border-stone-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">
                      Letölthető, frissített Raspberry Pi csomag:
                    </h4>
                    <p className="text-xs text-stone-500">
                      Összes szerverfájl, adatbáziskezelő és automatikus venv telepítő egyben.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href="/api/download-pi-package"
                      download="recept_adatbazis_v1.0.0.zip"
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ZIP Letöltése (9 MB)</span>
                    </a>
                    <a
                      href="/api/download-pi-tar"
                      download="recept_adatbazis_v1.0.0.tar.gz"
                      className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>tar.gz (Linuxhoz)</span>
                    </a>
                  </div>
                </div>

                {/* Direct One-Liner Terminal Command for Raspberry Pi */}
                <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-2 border border-stone-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Server className="w-4 h-4" />
                      <span>Közvetlen letöltés a Pi terminálban (GitHub nélkül!):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `cd /home/pi && curl -o recept_csomag.tar.gz -L "${window.location.origin}/api/download-pi-tar" && mkdir -p recept_adatbazis && tar -xzf recept_csomag.tar.gz -C recept_adatbazis && cd recept_adatbazis && chmod +x setup_pi.sh && ./setup_pi.sh`;
                        navigator.clipboard.writeText(cmd);
                        showToast('Parancs másolva a vágólapra! Illeszd be a Pi termináljába.', 'success');
                      }}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>Parancs másolása</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Nem kell GitHub token vagy pendrive! Csak nyiss egy SSH terminált a Pi-n, és másold be ezt az egyetlen parancssort:
                  </p>
                  <pre className="text-[11px] font-mono bg-black/50 p-2.5 rounded-lg overflow-x-auto text-amber-200 select-all whitespace-pre-wrap break-all">
                    cd /home/pi && curl -o recept_csomag.tar.gz -L "{typeof window !== 'undefined' ? window.location.origin : ''}/api/download-pi-tar" && mkdir -p recept_adatbazis && tar -xzf recept_csomag.tar.gz -C recept_adatbazis && cd recept_adatbazis && chmod +x setup_pi.sh && ./setup_pi.sh
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
                      <FileCode className="w-4 h-4 text-amber-600" />
                      <span>database.py</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Egyesített SQLite adatbázis sémakezelő, családtagokkal, szavazatokkal és bevásárlólistával.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
                      <FileCode className="w-4 h-4 text-amber-600" />
                      <span>app.py (Flask + REST API)</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      CORS támogatással, YouTube beágyazással, bevásárlólista és szavazó végpontokkal.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
                      <FileCode className="w-4 h-4 text-amber-600" />
                      <span>setup_pi.sh (Egykattintásos Telepítő)</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Automatikus venv környezet, pip függőségek és adatbázis inicializálás Raspberry Pi-n.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
                      <FileCode className="w-4 h-4 text-amber-600" />
                      <span>receptkonyv.service</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Systemd háttérszolgáltatás a Pi újraindulásakor történő automatikus indításhoz.
                    </p>
                  </div>
                </div>
              </div>

              {/* Raspberry Pi Live REST IP Tester */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <h4 className="font-semibold text-stone-900 text-sm">
                  Közvetlen Kapcsolat Tesztelése a Raspberry Pi-hez:
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={piServerIp}
                    onChange={(e) => setPiServerIp(e.target.value)}
                    placeholder="http://192.168.1.xxx:5000"
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={testRaspberryPi}
                    disabled={piTestStatus.testing}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {piTestStatus.testing ? 'Tesztelés...' : 'Kapcsolat Teszt'}
                  </button>
                </div>
                {piTestStatus.message && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 leading-relaxed">
                    {piTestStatus.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* RECIPE DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedRecipe && !isEditing && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 flex flex-col">
            {/* Modal Header Bar */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                  {selectedRecipe.category}
                </span>
                <span className="text-xs text-stone-500">·</span>
                <span className="text-xs text-stone-600 font-medium">Szakács: {selectedRecipe.chef || 'Admin'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => launchCookingMode(selectedRecipe)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Főzés megkezdése nagybetűs módban"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Főzés Indítása</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title="Nyomtatás"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditForm(JSON.parse(JSON.stringify(selectedRecipe)));
                    setIsEditing(true);
                  }}
                  className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                  title="Szerkesztés"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Recept törlése"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Title & Description */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
                  {selectedRecipe.title}
                </h2>
                {selectedRecipe.description && (
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                    {selectedRecipe.description}
                  </p>
                )}
              </div>

              {/* YouTube Video Player Embed if url is present */}
              {selectedRecipe.videoUrl && getEmbedUrl(selectedRecipe.videoUrl) && (
                <div className="rounded-2xl overflow-hidden aspect-video border border-stone-200 shadow-xs">
                  <iframe
                    src={getEmbedUrl(selectedRecipe.videoUrl)!}
                    title={selectedRecipe.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Meta stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                <div>
                  <span className="text-stone-400 block">Előkészítés</span>
                  <span className="font-bold text-stone-800">{selectedRecipe.prepTimeMinutes} perc</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Főzés / Sütés</span>
                  <span className="font-bold text-stone-800">{selectedRecipe.cookTimeMinutes} perc</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Alapadag</span>
                  <span className="font-bold text-stone-800">{selectedRecipe.servings} személyre</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Nehézség</span>
                  <span className="font-bold text-stone-800">{selectedRecipe.difficulty}</span>
                </div>
              </div>

              {/* Family Voting Block */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Családi Szavazás & Visszajelzés
                  </span>
                  <span className="text-xs text-stone-500">
                    Bejelentkezve: <strong>{currentMember}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleVote(selectedRecipe.id, true)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      selectedRecipe.likes?.includes(currentMember)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Ízlik! ({selectedRecipe.likes?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => handleVote(selectedRecipe.id, false)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      selectedRecipe.dislikes?.includes(currentMember)
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Nem ízlik ({selectedRecipe.dislikes?.length || 0})</span>
                  </button>
                </div>

                {/* Who liked it display */}
                {selectedRecipe.likes && selectedRecipe.likes.length > 0 && (
                  <div className="text-xs text-stone-600 pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-700 font-semibold">Akiknek ízlett:</span>
                    {selectedRecipe.likes.map((name) => (
                      <span key={name} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[11px] font-medium border border-emerald-200/60">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Servings Scaler (Dinamikus Adagkalkulátor) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Adagméret újraszámolása:
                  </span>
                  <span className="text-sm font-black text-amber-900 tabular-nums">
                    {Math.round(selectedRecipe.servings * servingsMultiplier)} adag
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0.5, 1, 1.5, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => setServingsMultiplier(m)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        servingsMultiplier === m
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {Math.round(selectedRecipe.servings * m)} adag
                    </button>
                  ))}
                  <button
                    onClick={() => setServingsMultiplier(1)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 text-xs ml-1 cursor-pointer"
                    title="Visszaállítás"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ingredients section with Send to Shopping List button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-stone-900 text-base">
                    Hozzávalók ({selectedRecipe.ingredients.length})
                  </h3>
                  <button
                    onClick={() => addIngredientsToShoppingList(selectedRecipe)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Küldés a Bevásárlólistára</span>
                  </button>
                </div>

                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {selectedRecipe.ingredients.map((ing) => {
                    const isChecked = !!checkedIngredients[ing.id];
                    const scaled = Math.round(ing.amount * servingsMultiplier * 10) / 10;
                    return (
                      <div
                        key={ing.id}
                        onClick={() =>
                          setCheckedIngredients((prev) => ({
                            ...prev,
                            [ing.id]: !prev[ing.id]
                          }))
                        }
                        className={`flex items-center justify-between p-3.5 text-sm cursor-pointer hover:bg-stone-50 transition-colors ${
                          isChecked ? 'bg-stone-50 text-stone-400 line-through' : 'text-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-300 shrink-0" />
                          )}
                          <span>{ing.name}</span>
                        </div>
                        <div className="text-xs font-bold tabular-nums text-stone-700 pl-4">
                          {scaled} {ing.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <h3 className="font-bold text-stone-900 text-base">Elkészítés lépései</h3>
                <div className="space-y-3">
                  {selectedRecipe.steps.map((st) => {
                    const isDone = !!completedSteps[st.stepNumber];
                    return (
                      <div
                        key={st.stepNumber}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDone ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {st.stepNumber}
                            </span>
                            <p className="text-sm text-stone-800 leading-relaxed font-normal">
                              {st.instruction}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {st.durationMinutes && (
                              <button
                                onClick={() =>
                                  startTimerForMinutes(
                                    st.durationMinutes!,
                                    `${selectedRecipe.title} - ${st.stepNumber}. lépés`
                                  )
                                }
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Play className="w-3 h-3 text-amber-600" />
                                <span>{st.durationMinutes}p</span>
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setCompletedSteps((prev) => ({
                                  ...prev,
                                  [st.stepNumber]: !prev[st.stepNumber]
                                }))
                              }
                              className="p-1 text-stone-400 hover:text-emerald-600 cursor-pointer"
                            >
                              <Check className={`w-4 h-4 ${isDone ? 'text-emerald-600 stroke-[3]' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedRecipe.notes && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed">
                  <span className="font-bold text-stone-800 block mb-1">Családi konyhai tipp / Megjegyzés:</span>
                  {selectedRecipe.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT & CREATE MODAL */}
      {/* ========================================================================= */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-stone-900 text-lg">
                  {editForm.id && recipes.some((r) => r.id === editForm.id)
                    ? 'Recept szerkesztése'
                    : 'Új recept hozzáadása'}
                </h3>
                {!recipes.some((r) => r.id === editForm.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setImportUrl('');
                      setImportRawText('');
                      setImportFile(null);
                      setExtractError(null);
                      setSmartImporterOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Recept beolvasása linkből, fotóból vagy PDF-ből"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Okos Beolvasás (AI)</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick banner to switch to smart importer if creating new recipe */}
            {!recipes.some((r) => r.id === editForm.id) && (
              <div className="mx-6 mt-4 p-4 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>🪄 Automatikus Recept Beolvasás (URL / Fotó / PDF / Szöveg)</span>
                      <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full">AI Segéd</span>
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5 leading-tight">
                      Nem szeretnéd kézzel begépelni? Töltsd be közvetlenül recept linkből, ételfotóról vagy PDF dokumentumból!
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setImportUrl('');
                    setImportRawText('');
                    setImportFile(null);
                    setExtractError(null);
                    setSmartImporterOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Okos Beolvasó indítása</span>
                </button>
              </div>
            )}

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Recept neve *</label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="pl. Csirkepaprikás, Hortobágyi palacsinta..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-stone-700">Kategória *</label>
                    {!isAddingNewCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(true);
                          setNewCategoryName('');
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Új egyéni kategória létrehozása"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Új kategória</span>
                      </button>
                    )}
                  </div>

                  {isAddingNewCategory ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="pl. Reggelik, Grill, Italok..."
                          className="flex-1 px-3 py-1.5 bg-white border-2 border-amber-500 rounded-lg text-xs font-semibold focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = newCategoryName.trim();
                              if (trimmed) {
                                if (!customCategories.includes(trimmed)) {
                                  setCustomCategories((prev) => [...prev, trimmed]);
                                }
                                setEditForm({ ...editForm, category: trimmed });
                                setIsAddingNewCategory(false);
                                setNewCategoryName('');
                                showToast(`"${trimmed}" kategória hozzáadva!`, 'success');
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newCategoryName.trim();
                            if (!trimmed) {
                              showToast('Kérlek írd be a kategória nevét!', 'warning');
                              return;
                            }
                            if (!customCategories.includes(trimmed)) {
                              setCustomCategories((prev) => [...prev, trimmed]);
                            }
                            setEditForm({ ...editForm, category: trimmed });
                            setIsAddingNewCategory(false);
                            setNewCategoryName('');
                            showToast(`"${trimmed}" kategória hozzáadva!`, 'success');
                          }}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(false);
                            setNewCategoryName('');
                          }}
                          className="px-2 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={editForm.category || 'Főételek'}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingNewCategory(true);
                          setNewCategoryName('');
                        } else {
                          setEditForm({ ...editForm, category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none cursor-pointer font-medium text-stone-800 text-xs"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-amber-700 font-bold">
                        ➕ + Új kategória megadása...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Szakács (Ki töltötte fel?)</label>
                  <select
                    value={editForm.chef || currentMember}
                    onChange={(e) => setEditForm({ ...editForm, chef: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Előkészítés (p)</label>
                  <input
                    type="number"
                    value={editForm.prepTimeMinutes || 15}
                    onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Főzés / Sütés (p)</label>
                  <input
                    type="number"
                    value={editForm.cookTimeMinutes || 30}
                    onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Adagok száma</label>
                  <input
                    type="number"
                    value={editForm.servings || 4}
                    onChange={(e) => setEditForm({ ...editForm, servings: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">YouTube Videó Link (opcionális)</label>
                <input
                  type="text"
                  value={editForm.videoUrl || ''}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Rövid leírás</label>
                <textarea
                  rows={2}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Néhány mondat az ételről..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700">Recept Fényképe (opcionális)</label>
                  <label className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotó feltöltése eszközről</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setEditForm({ ...editForm, imageUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={editForm.imageUrl || ''}
                  onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/... vagy tölts fel egy fotót"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />

                {editForm.imageUrl && (
                  <div className="mt-2.5 relative rounded-xl overflow-hidden border border-stone-200 group bg-stone-100 max-h-48">
                    <img
                      src={editForm.imageUrl}
                      alt="Recept előnézet"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, imageUrl: '' })}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kép eltávolítása</span>
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>{editForm.imageUrl.startsWith('data:') ? '📸 Beépített fotó (PDF-ből / Feltöltve)' : '🔗 Webes kép hivatkozás'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Családi tipp / Megjegyzés (opcionális)</label>
                <input
                  type="text"
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="pl. Füstölt szalonnazsírral a legfinomabb!"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                />
              </div>

              {/* Ingredients input list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-700">Hozzávalók</label>
                  <button
                    type="button"
                    onClick={() => {
                      const ings = editForm.ingredients || [];
                      setEditForm({
                        ...editForm,
                        ingredients: [...ings, { id: `ing-${Date.now()}`, name: '', amount: 100, unit: 'g' }]
                      });
                    }}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    + Hozzávaló hozzáadása
                  </button>
                </div>
                <div className="space-y-2">
                  {(editForm.ingredients || []).map((ing, idx) => (
                    <div key={ing.id || idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Megnevezés"
                        value={ing.name}
                        onChange={(e) => {
                          const updated = [...(editForm.ingredients || [])];
                          updated[idx].name = e.target.value;
                          setEditForm({ ...editForm, ingredients: updated });
                        }}
                        className="flex-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Mennyiség"
                        value={ing.amount}
                        onChange={(e) => {
                          const updated = [...(editForm.ingredients || [])];
                          updated[idx].amount = Number(e.target.value);
                          setEditForm({ ...editForm, ingredients: updated });
                        }}
                        className="w-20 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Egység (g, db)"
                        value={ing.unit}
                        onChange={(e) => {
                          const updated = [...(editForm.ingredients || [])];
                          updated[idx].unit = e.target.value;
                          setEditForm({ ...editForm, ingredients: updated });
                        }}
                        className="w-24 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editForm.ingredients || []).filter((_, i) => i !== idx);
                          setEditForm({ ...editForm, ingredients: updated });
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps input list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-700">Elkészítési lépések</label>
                  <button
                    type="button"
                    onClick={() => {
                      const steps = editForm.steps || [];
                      setEditForm({
                        ...editForm,
                        steps: [...steps, { stepNumber: steps.length + 1, instruction: '', durationMinutes: 10 }]
                      });
                    }}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    + Lépés hozzáadása
                  </button>
                </div>
                <div className="space-y-2">
                  {(editForm.steps || []).map((step, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="font-bold text-stone-500 mt-2">{idx + 1}.</span>
                      <textarea
                        rows={2}
                        placeholder="Lépés leírása..."
                        value={step.instruction}
                        onChange={(e) => {
                          const updated = [...(editForm.steps || [])];
                          updated[idx].instruction = e.target.value;
                          setEditForm({ ...editForm, steps: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Perc"
                        value={step.durationMinutes || ''}
                        onChange={(e) => {
                          const updated = [...(editForm.steps || [])];
                          updated[idx].durationMinutes = Number(e.target.value) || undefined;
                          setEditForm({ ...editForm, steps: updated });
                        }}
                        className="w-16 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (editForm.steps || []).filter((_, i) => i !== idx);
                          setEditForm({ ...editForm, steps: updated });
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal action footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 sticky bottom-0">
              <div>
                {editForm.id && recipes.some((r) => r.id === editForm.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(editForm.id!)}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Recept Törlése</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Mégse
                </button>
              <button
                type="button"
                onClick={() => {
                  if (!editForm.title || !editForm.title.trim()) {
                    showToast('Kérlek adj meg egy recept címet!', 'warning');
                    return;
                  }
                  const fullRecipe: Recipe = {
                    id: editForm.id || `rec-${Date.now()}`,
                    title: editForm.title.trim(),
                    description: editForm.description || '',
                    category: editForm.category || 'Főételek',
                    chef: editForm.chef || currentMember,
                    prepTimeMinutes: Number(editForm.prepTimeMinutes) || 15,
                    cookTimeMinutes: Number(editForm.cookTimeMinutes) || 30,
                    servings: Number(editForm.servings) || 4,
                    difficulty: editForm.difficulty || 'Közepes',
                    tags: editForm.tags || ['Családi'],
                    ingredients: (editForm.ingredients || []).filter((i) => i.name.trim() !== ''),
                    steps: (editForm.steps || []).filter((s) => s.instruction.trim() !== ''),
                    videoUrl: editForm.videoUrl || '',
                    imageUrl: editForm.imageUrl || '',
                    notes: editForm.notes || '',
                    createdAt: editForm.createdAt || new Date().toISOString().split('T')[0],
                    likes: editForm.likes || [currentMember],
                    dislikes: editForm.dislikes || []
                  };

                  const savedCat = (fullRecipe.category || 'Főételek').trim();
                  if (savedCat && !customCategories.includes(savedCat)) {
                    setCustomCategories((prev) => [...prev, savedCat]);
                  }

                  setRecipes((prev) => {
                    const exists = prev.some((r) => r.id === fullRecipe.id);
                    return exists ? prev.map((r) => (r.id === fullRecipe.id ? fullRecipe : r)) : [fullRecipe, ...prev];
                  });
                  if (selectedRecipe && selectedRecipe.id === fullRecipe.id) {
                    setSelectedRecipe(fullRecipe);
                  }
                  setIsEditing(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Recept Mentése
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* SMART RECIPESAGE-STYLE IMPORTER MODAL (URL, TEXT, IMAGE, PDF) */}
      {/* ========================================================================= */}
      {smartImporterOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Automatikus Recept Beolvasás
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    URL-ből, fotóból, nyers szövegből vagy PDF-ből (RecipeSage technológiával)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSmartImporterOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Importer Type Tabs */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setImportType('url'); setExtractError(null); }}
                  className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    importType === 'url' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setImportType('text'); setExtractError(null); }}
                  className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    importType === 'text' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Szöveg</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setImportType('image'); setExtractError(null); }}
                  className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    importType === 'image' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fénykép</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setImportType('pdf'); setExtractError(null); }}
                  className={`py-2 px-1 sm:px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    importType === 'pdf' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-rose-600" />
                  <span>PDF Fájl</span>
                </button>
              </div>

              {/* Source Inputs */}
              {importType === 'url' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Recept weboldal linkje (URL):
                  </label>
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="pl. https://www.nosalty.hu/recept/... vagy https://streetkitchen.hu/..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <p className="text-[11px] text-stone-400">
                    Támogatja a Nosalty, Mindmegette, Street Kitchen, AllRecipes, Cookpad és más receptoldalak linkjeit.
                  </p>
                </div>
              )}

              {importType === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Másold be a recept szövegét vagy jegyzeteit:
                  </label>
                  <textarea
                    rows={6}
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    placeholder="Illeszd be ide a recept hozzávalóit és leírását bármilyen formátumban (pl. emailből, üzenetből, Word-ből)..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}

              {importType === 'image' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-stone-700">
                    Fénykép feltöltése szakácskönyvből vagy kézzel írt receptről:
                  </label>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl bg-stone-50 cursor-pointer transition-colors text-center">
                    <Camera className="w-8 h-8 text-stone-400 mb-2" />
                    <span className="text-xs font-semibold text-stone-700">
                      {importFile?.previewUrl ? importFile.name : 'Kattints ide a fotó kiválasztásához'}
                    </span>
                    <span className="text-[11px] text-stone-400 mt-1">PNG, JPG, WebP formátum</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSmartFileChange}
                      className="hidden"
                    />
                  </label>

                  {importFile?.previewUrl && (
                    <div className="relative rounded-xl overflow-hidden max-h-48 border border-stone-200">
                      <img src={importFile.previewUrl} alt="Előnézet" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {importType === 'pdf' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-700">
                      Recept PDF dokumentum feltöltése:
                    </label>
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚡ Gyors szöveg-kinyerés
                    </span>
                  </div>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl bg-stone-50 cursor-pointer transition-colors text-center">
                    <FileCode className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-xs font-semibold text-stone-700">
                      {importFile ? `${importFile.name} ${importFile.sizeMb ? `(${importFile.sizeMb} MB)` : ''}` : 'Kattints ide a PDF kiválasztásához'}
                    </span>
                    <span className="text-[11px] text-stone-400 mt-1">PDF dokumentum (ajánlott: max. 18 MB)</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleSmartFileChange}
                      className="hidden"
                    />
                  </label>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5 text-xs text-stone-700">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed text-stone-600">
                      <strong>Gyors és pontos szöveg-kinyerés:</strong> A rendszer villámgyorsan kinyeri a PDF-ből a recept címét, a pontos hozzávalókat és az elkészítési lépéseket. Képet a szerkesztőben kényelmesen, manuálisan tölthetsz fel az ételről.
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message with Quick Retry */}
              {extractError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {extractError.includes('503') || extractError.includes('high demand') || extractError.includes('UNAVAILABLE')
                          ? 'A szerver pillanatnyilag túlterhelt (503)'
                          : 'Hiba a feldolgozás során'}
                      </div>
                      <div className="text-[11px] text-rose-700 leading-relaxed">
                        {extractError.includes('503') || extractError.includes('high demand')
                          ? 'A háttérben beállítottam az automatikus tartalék-modelleket. Kérlek kattints az Újra gombra!'
                          : extractError}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExtractRecipe}
                    disabled={isExtracting}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Újra
                  </button>
                </div>
              )}

              {/* Loading State Banner */}
              {isExtracting && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      Recept elemzése és kinyerése folyamatban...
                    </div>
                    <div className="text-[11px] text-amber-700">
                      A mesterséges intelligencia átvizsgálja a forrást, szétválogatja a hozzávalókat és lépésekre bontja az elkészítést.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSmartImporterOpen(false)}
                disabled={isExtracting}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleExtractRecipe}
                disabled={isExtracting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Recept Automatikus Kinyerése</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP RECIPE DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-lg font-bold text-stone-900">
                  Recept végleges törlése
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Biztosan törölni szeretnéd a(z) <strong className="text-stone-900 font-bold">„{recipeToDelete.title}”</strong> receptet?
                </p>
                <p className="text-[11px] text-rose-600 font-medium">
                  Ez a művelet azonnali és nem vonható vissza. A recept kikerül a családi szakácskönyvből és a mentett receptek közül.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecipe}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Igen, végleges törlés</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP CUSTOM CATEGORIES MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {isCategoryManageOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Saját Kategóriák Kezelése
                  </h3>
                  <p className="text-xs text-stone-500">
                    Hozz létre új kategóriákat és szűrj rájuk a recepttárban
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryManageOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Új kategória hozzáadása
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manageCategoryInput}
                  onChange={(e) => setManageCategoryInput(e.target.value)}
                  placeholder="pl. Reggelik, Grill & Bogrács, Gyors vacsorák..."
                  className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = manageCategoryInput.trim();
                      if (trimmed) {
                        if (allCategories.includes(trimmed)) {
                          showToast('Ez a kategória már létezik!', 'warning');
                        } else {
                          setCustomCategories((prev) => [...prev, trimmed]);
                          setSelectedCategory(trimmed);
                          setManageCategoryInput('');
                          showToast(`"${trimmed}" kategória sikeresen hozzáadva!`, 'success');
                        }
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = manageCategoryInput.trim();
                    if (!trimmed) {
                      showToast('Kérlek írd be a kategória nevét!', 'warning');
                      return;
                    }
                    if (allCategories.includes(trimmed)) {
                      showToast('Ez a kategória már létezik!', 'warning');
                      return;
                    }
                    setCustomCategories((prev) => [...prev, trimmed]);
                    setSelectedCategory(trimmed);
                    setManageCategoryInput('');
                    showToast(`"${trimmed}" kategória sikeresen hozzáadva!`, 'success');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Hozzáadás</span>
                </button>
              </div>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="text-xs font-bold text-stone-700">
                Jelenlegi kategóriák ({allCategories.length} db):
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {allCategories.map((cat) => {
                  const count = recipes.filter((r) => r.category === cat).length;
                  const isDefault = defaultCategories.includes(cat);
                  return (
                    <div
                      key={cat}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 flex items-center gap-2 group"
                    >
                      <span
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryManageOpen(false);
                        }}
                        className="cursor-pointer hover:text-amber-700 hover:underline"
                        title="Szűrés erre a kategóriára"
                      >
                        {cat}
                      </span>
                      <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.2 rounded-full tabular-nums">
                        {count} db
                      </span>
                      {!isDefault && count === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCategories((prev) => prev.filter((c) => c !== cat));
                            if (selectedCategory === cat) setSelectedCategory('Összes');
                            showToast(`"${cat}" kategória eltávolítva.`, 'info');
                          }}
                          className="text-stone-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          title="Üres egyéni kategória törlése"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
              <span className="text-[11px] text-stone-500">
                A kategóriák azonnal elmentődnek a memóriába.
              </span>
              <button
                type="button"
                onClick={() => setIsCategoryManageOpen(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Kész
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span>Családi Receptkönyv</span>
            <span className="ml-1 font-mono text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
              {APP_VERSION}
            </span>
            <span className="mx-2">·</span>
            <span>Anya · Apa · Krisi · Rolcsi · Mark · Brigi</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200/70 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>Felhasználói Kézikönyv</span>
            </button>
            <span>·</span>
            <button onClick={() => setActiveTab('pi')} className="hover:text-stone-900 cursor-pointer">
              Raspberry Pi Hub & Fájlok
            </button>
            <span>·</span>
            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recipes, null, 2));
                const a = document.createElement('a');
                a.setAttribute('href', dataStr);
                a.setAttribute('download', `csaladi_receptek_mentes_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(a);
                a.click();
                a.remove();
              }}
              className="hover:text-stone-900 cursor-pointer"
            >
              Adatbázis Mentés (JSON)
            </button>
          </div>
        </div>
      </footer>

      {/* Comprehensive User Guide & Documentation Modal */}
      <UserGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsHelpOpen(false);
        }}
        onOpenNewRecipe={() => {
          setIsHelpOpen(false);
          setEditForm({
            id: `rec-${Date.now()}`,
            title: '',
            description: '',
            category: 'Főételek',
            chef: currentMember,
            prepTimeMinutes: 15,
            cookTimeMinutes: 30,
            servings: 4,
            difficulty: 'Könnyű',
            tags: ['Családi'],
            ingredients: [{ id: 'ing-1', name: '', amount: 100, unit: 'g' }],
            steps: [{ stepNumber: 1, instruction: '', durationMinutes: 10 }],
            likes: [currentMember],
            dislikes: [],
            createdAt: new Date().toISOString().split('T')[0]
          });
          setIsEditing(true);
        }}
      />

      {/* Modern In-App Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-50 border-emerald-700/50'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900/95 text-amber-50 border-amber-700/50'
                : 'bg-stone-900/95 text-stone-50 border-stone-700/50'
            }`}
          >
            <span className="text-sm font-medium leading-snug">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
