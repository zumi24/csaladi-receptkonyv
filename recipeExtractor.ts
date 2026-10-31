import type { IncomingMessage, ServerResponse } from 'http';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// Helper to extract Schema.org JSON-LD Recipe from HTML
export function tryExtractSchemaOrgRecipe(html: string, sourceUrl: string): any | null {
  try {
    const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent);

        // Can be a single object, an array, or have "@graph"
        const items = Array.isArray(parsed)
          ? parsed
          : (parsed['@graph'] && Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]);

        for (const item of items) {
          const type = item['@type'];
          const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
          if (isRecipe) {
            const title = item.name || item.headline || '';
            const description = item.description || '';

            // Extract image URL
            let imageUrl = '';
            if (typeof item.image === 'string') {
              imageUrl = item.image;
            } else if (Array.isArray(item.image) && item.image.length > 0) {
              imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || '';
            } else if (item.image && typeof item.image === 'object') {
              imageUrl = item.image.url || '';
            }

            // Resolve relative image URL if needed
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
              try {
                imageUrl = new URL(imageUrl, sourceUrl).href;
              } catch {}
            }

            // ISO 8601 duration parser (PT30M, PT1H15M, P0DT0H45M)
            const parseDuration = (dur: any): number => {
              if (typeof dur !== 'string') return 0;
              const hMatch = dur.match(/(\d+)\s*H/i);
              const mMatch = dur.match(/(\d+)\s*M/i);
              const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
              const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
              return (hours * 60) + mins;
            };

            const prepTimeMinutes = parseDuration(item.prepTime) || 15;
            const cookTimeMinutes = parseDuration(item.cookTime) || (parseDuration(item.totalTime) ? Math.max(0, parseDuration(item.totalTime) - prepTimeMinutes) : 30);

            // Servings
            let servings = 4;
            if (item.recipeYield) {
              const yStr = String(item.recipeYield);
              const yMatch = yStr.match(/\d+/);
              if (yMatch) servings = parseInt(yMatch[0], 10);
            }

            // Category
            let category = 'Főételek';
            const catRaw = Array.isArray(item.recipeCategory) ? item.recipeCategory.join(' ') : String(item.recipeCategory || '');
            const catLower = catRaw.toLowerCase();
            if (catLower.includes('leves') || catLower.includes('soup')) category = 'Levesek';
            else if (catLower.includes('desszert') || catLower.includes('sütemény') || catLower.includes('torta') || catLower.includes('dessert') || catLower.includes('cake')) category = 'Desszertek';
            else if (catLower.includes('pék') || catLower.includes('kenyér') || catLower.includes('kifli') || catLower.includes('bread')) category = 'Péksütemények';
            else if (catLower.includes('saláta') || catLower.includes('salad')) category = 'Saláták';
            else if (catRaw.trim()) category = catRaw.trim();

            // Extract ingredients
            const rawIngredients = item.recipeIngredient || item.ingredients || [];
            const ingredients: any[] = [];
            if (Array.isArray(rawIngredients)) {
              rawIngredients.forEach((ing: any, idx: number) => {
                if (typeof ing === 'string' && ing.trim()) {
                  const ingText = ing.trim();
                  const matchIng = ingText.match(/^([\d.,\/\s]+)\s*(kg|dkg|g|ml|dl|l|liter|ek|tk|kávéskanál|evőkanál|csipet|db|gerezd|fej|csomag|tasak|szem|bögre|pohár|szelet|marék)?\s*(.*)$/i);
                  if (matchIng && matchIng[3]) {
                    const numRaw = matchIng[1].replace(',', '.').trim();
                    const amount = parseFloat(numRaw) || 1;
                    const unit = matchIng[2] || 'db';
                    const name = matchIng[3].trim().replace(/^[-–—]\s*/, '');
                    ingredients.push({
                      id: `ing-${Date.now()}-${idx}`,
                      name: name || ingText,
                      amount,
                      unit
                    });
                  } else {
                    const isIzlesSzerint = ingText.toLowerCase().includes('ízlés szerint');
                    ingredients.push({
                      id: `ing-${Date.now()}-${idx}`,
                      name: ingText,
                      amount: 1,
                      unit: isIzlesSzerint ? 'ízlés szerint' : 'adag'
                    });
                  }
                }
              });
            }

            // Extract instructions / steps
            const extractStepTexts = (instructions: any): string[] => {
              const resList: string[] = [];
              if (!instructions) return resList;
              if (typeof instructions === 'string') {
                return instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
              }
              if (Array.isArray(instructions)) {
                for (const elem of instructions) {
                  if (typeof elem === 'string') {
                    if (elem.trim()) resList.push(elem.trim());
                  } else if (elem && typeof elem === 'object') {
                    if (elem.itemListElement) {
                      resList.push(...extractStepTexts(elem.itemListElement));
                    } else {
                      const txt = elem.text || elem.name || elem.description || '';
                      if (txt.trim()) resList.push(txt.trim());
                    }
                  }
                }
              }
              return resList;
            };

            const stepTexts = extractStepTexts(item.recipeInstructions);
            const steps = stepTexts.map((text, idx) => ({
              stepNumber: idx + 1,
              instruction: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            }));

            if (title && (ingredients.length > 0 || steps.length > 0)) {
              return {
                title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                category,
                description: description ? description.replace(/<[^>]+>/g, ' ').slice(0, 300).trim() : '',
                prepTimeMinutes,
                cookTimeMinutes,
                servings,
                difficulty: 'Közepes',
                tags: ['Weboldalról', 'Családi'],
                ingredients,
                steps,
                notes: `Forrás: ${sourceUrl}`,
                imageUrl
              };
            }
          }
        }
      } catch (e) {
        // Continue searching in next script tag
      }
    }
  } catch (err) {
    console.warn('JSON-LD parse warning:', err);
  }
  return null;
}

// Fallback metadata / HTML scraper when Schema.org is not provided
export function extractBasicHtmlRecipe(html: string, sourceUrl: string): any | null {
  try {
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s*[-–|].*$/, '').trim() : '';

    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    let imageUrl = imgMatch ? imgMatch[1].trim() : '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      try { imageUrl = new URL(imageUrl, sourceUrl).href; } catch {}
    }

    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    if (title) {
      return {
        title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        category: 'Főételek',
        description,
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        servings: 4,
        difficulty: 'Könnyű',
        tags: ['Weboldalról'],
        ingredients: [
          { id: `ing-${Date.now()}-1`, name: 'Recept hozzávalói (lásd a megnyitott oldalon)', amount: 1, unit: 'adag' }
        ],
        steps: [
          { stepNumber: 1, instruction: 'Látogasd meg az eredeti receptoldalt a részletes lépésekhez.' }
        ],
        notes: `Forrás: ${sourceUrl}`,
        imageUrl
      };
    }
  } catch {}
  return null;
}

// Helper to extract embedded JPEG images from PDF buffer
export function extractImagesFromPdfBuffer(buffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  let i = 0;
  while (i < buffer.length - 3) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
      const start = i;
      let end = -1;
      for (let j = start + 3; j < buffer.length - 1; j++) {
        if (buffer[j] === 0xFF && buffer[j + 1] === 0xD9) {
          end = j + 2;
          break;
        }
      }
      if (end !== -1 && (end - start) > 1024) {
        images.push(buffer.subarray(start, end));
        i = end;
        continue;
      }
    }
    i++;
  }
  return images;
}

// Helper to run offline Tesseract OCR on image buffer
export async function runOfflineOcr(imageBuffer: Buffer): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(['hun', 'eng']);
    try {
      const ret = await worker.recognize(imageBuffer);
      return ret.data.text || '';
    } finally {
      await worker.terminate();
    }
  } catch (err: any) {
    console.warn('[Offline OCR Warning]', err.message);
    return '';
  }
}

// Intelligent Hungarian text parser for offline recipes and PDFs
export function parseRecipeFromHungarianText(text: string): {
  title: string;
  category: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'Könnyű' | 'Közepes' | 'Haladó';
  tags: string[];
  ingredients: Array<{ id: string; name: string; amount: number; unit: string }>;
  steps: Array<{ stepNumber: number; instruction: string }>;
  imageUrl?: string;
} {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      title: 'Beolvasott recept',
      category: 'Főételek',
      description: '',
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      servings: 4,
      difficulty: 'Közepes',
      tags: ['PDF Beolvasás'],
      ingredients: [],
      steps: []
    };
  }

  let title = '';
  let category = 'Főételek';
  const ingredients: Array<{ id: string; name: string; amount: number; unit: string }> = [];
  const steps: Array<{ stepNumber: number; instruction: string }> = [];
  let description = '';

  let mode: 'header' | 'ingredients' | 'steps' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    if (!title && !lower.includes('hozzávaló') && !lower.includes('alapanyag') && !lower.includes('bevásárló') && !lower.includes('elkészítés') && line.length < 90) {
      title = line.replace(/^[#*\-•\d.]+\s*/, '').trim();
      continue;
    }

    if (lower.startsWith('hozzávaló') || lower.includes('alapanyag') || lower.includes('bevásárlólista') || lower.includes('ingredients')) {
      mode = 'ingredients';
      continue;
    }
    if (lower.startsWith('elkészítés') || lower.startsWith('leírás') || lower.startsWith('lépések') || lower.startsWith('recept') || lower.includes('instructions') || lower.includes('how to')) {
      mode = 'steps';
      continue;
    }

    const matchIng = line.match(/^[-*•\d.)\s]*([\d.,\/\s]+)\s*(kg|dkg|g|ml|dl|l|liter|ek|tk|kávéskanál|evőkanál|csipet|db|gerezd|fej|csomag|tasak|szem|bögre|pohár|szelet|marék)?\s*(.*)$/i);
    const hasIngredientUnit = matchIng && (matchIng[2] || (matchIng[1] && matchIng[3]));

    if (mode === 'ingredients' || (mode === 'header' && hasIngredientUnit)) {
      if (matchIng && matchIng[3]) {
        const numRaw = matchIng[1].replace(',', '.').trim();
        const amount = parseFloat(numRaw) || 1;
        const unit = matchIng[2] || 'db';
        const name = matchIng[3].trim().replace(/^[-–—:]\s*/, '');
        if (name && !name.toLowerCase().startsWith('elkészítés')) {
          ingredients.push({
            id: `ing-${Date.now()}-${ingredients.length}`,
            name,
            amount,
            unit
          });
          mode = 'ingredients';
          continue;
        }
      } else if (line.includes('ízlés szerint') || line.startsWith('-') || line.startsWith('•')) {
        ingredients.push({
          id: `ing-${Date.now()}-${ingredients.length}`,
          name: line.replace(/^[-*•]\s*/, ''),
          amount: 1,
          unit: 'ízlés szerint'
        });
        mode = 'ingredients';
        continue;
      }
    }

    if (mode === 'steps' || (!hasIngredientUnit && ingredients.length > 0)) {
      const cleanStep = line.replace(/^\d+[.)\s-]+/, '').trim();
      if (cleanStep.length > 5) {
        steps.push({
          stepNumber: steps.length + 1,
          instruction: cleanStep
        });
        mode = 'steps';
      }
    } else if (mode === 'header' && !description) {
      description = line;
    }
  }

  const fullContent = (title + ' ' + text).toLowerCase();
  if (fullContent.includes('leves') || fullContent.includes('gulyás') || fullContent.includes('krémleves')) category = 'Levesek';
  else if (fullContent.includes('torta') || fullContent.includes('sütemény') || fullContent.includes('muffin') || fullContent.includes('keksz') || fullContent.includes('piskóta') || fullContent.includes('palacsinta') || fullContent.includes('desszert')) category = 'Desszertek';
  else if (fullContent.includes('kenyér') || fullContent.includes('kifli') || fullContent.includes('zsemle') || fullContent.includes('pogácsa') || fullContent.includes('kalács')) category = 'Péksütemények';
  else if (fullContent.includes('saláta')) category = 'Saláták';

  return {
    title: title || 'Beolvasott recept',
    category,
    description: description.slice(0, 300),
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings: 4,
    difficulty: 'Közepes',
    tags: ['PDF Beolvasás', 'Családi'],
    ingredients: ingredients.length > 0 ? ingredients : [{ id: `ing-1`, name: 'Összetevők (lásd a leírásban)', amount: 1, unit: 'adag' }],
    steps: steps.length > 0 ? steps : [{ stepNumber: 1, instruction: text.slice(0, 500) }]
  };
}

export async function extractRecipeCore(payload: { type: string; content: string; mimeType?: string; apiKey?: string }): Promise<any> {
  const { type, content, apiKey } = payload;
  if (!content) {
    throw new Error('A bemeneti tartalom kötelező!');
  }

  // Use dynamically provided apiKey or server-side env apiKey
  const activeAi = (apiKey && apiKey.trim())
    ? new GoogleGenAI({ apiKey: apiKey.trim() })
    : ai;

  if (type === 'url') {
    let fetchedText = '';
    try {
      const fetchRes = await fetch(content, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      fetchedText = await fetchRes.text();
    } catch (fetchErr: any) {
      throw new Error(`Nem sikerült elérni a weboldalt (${content}). Ellenőrizd a hálózatot vagy a linket!`);
    }

    // 1. Try direct Schema.org / JSON-LD extraction
    const schemaRecipe = tryExtractSchemaOrgRecipe(fetchedText, content);
    if (schemaRecipe) {
      return {
        recipe: schemaRecipe,
        extractedImages: schemaRecipe.imageUrl ? [schemaRecipe.imageUrl] : [],
        hasPdfImage: false
      };
    }

    // 2. Try OpenGraph / basic HTML fallback if AI is not available
    if (!activeAi) {
      const basicRecipe = extractBasicHtmlRecipe(fetchedText, content);
      if (basicRecipe) {
        return {
          recipe: basicRecipe,
          extractedImages: basicRecipe.imageUrl ? [basicRecipe.imageUrl] : [],
          hasPdfImage: false
        };
      }
      throw new Error('A megadott weboldal nem tartalmazott közvetlenül értelmezhető recept-adatot. AI-alapú elemzéshez adj meg GEMINI_API_KEY kulcsot!');
    }

    // 3. Fallback to Gemini AI with clean HTML
    fetchedText = fetchedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    fetchedText = fetchedText.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    fetchedText = fetchedText.slice(0, 40000);

    const prompt = `Kérlek alakítsd át az alábbi weboldalt érvényes JSON receptté (title, category, description, prepTimeMinutes, cookTimeMinutes, servings, ingredients: [{name, amount, unit}], steps: [{stepNumber, instruction}], imageUrl).\nWebcím: ${content}\n\nTartalom:\n${fetchedText}`;
    const response = await activeAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text || '{}');
    return { recipe: parsed, extractedImages: parsed.imageUrl ? [parsed.imageUrl] : [], hasPdfImage: false };
  }

  if (type === 'pdf') {
    // 1. Try local offline PDF text extraction (100% free, no API key needed!)
    let extractedText = '';
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const cleanBase64 = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const rawData = Buffer.from(cleanBase64, 'base64');
      const uint8 = new Uint8Array(rawData);
      const loadingTask = pdfjs.getDocument({ data: uint8 });
      const pdfDoc = await loadingTask.promise;
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items.map((it: any) => it.str || '').join(' ');
        extractedText += pageStr + '\n';
      }
      extractedText = extractedText.trim();
    } catch (pdfErr: any) {
      console.warn('Local PDF extraction warning:', pdfErr.message);
    }

    if (extractedText && extractedText.length > 20) {
      console.log(`[Offline PDF] Sikeres helyi PDF szövegkinyerés (${extractedText.length} karakter)`);
      const parsedRecipe = parseRecipeFromHungarianText(extractedText);
      return {
        recipe: parsedRecipe,
        extractedImages: [],
        hasPdfImage: false
      };
    }

    // 2. If it's a scanned PDF (image only) and Gemini is available:
    if (activeAi) {
      const cleanBase64 = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const response = await activeAi.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { text: 'Olvasd le a csatolt szkennelt PDF-ből a receptet és konvertáld JSON formátumba (title, category, description, prepTimeMinutes, cookTimeMinutes, servings, ingredients: [{name, amount, unit}], steps: [{stepNumber, instruction}]).' },
          { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } }
        ],
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text || '{}');
      return { recipe: parsed, extractedImages: [], hasPdfImage: false };
    }

    // 3. Try offline Tesseract OCR if no Gemini API key is configured
    console.log('[Offline OCR] Szkennelt PDF észlelve, helyi OCR szövegfelismerés indítása...');
    try {
      const cleanBase64 = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');
      const embeddedImages = extractImagesFromPdfBuffer(pdfBuffer);
      if (embeddedImages.length > 0) {
        embeddedImages.sort((a, b) => b.length - a.length);
        const bestImage = embeddedImages[0];
        console.log(`[Offline OCR] Kép észlelve a PDF-ben (${Math.round(bestImage.length / 1024)} KB), Tesseract OCR futtatása...`);
        const ocrText = await runOfflineOcr(bestImage);
        if (ocrText && ocrText.trim().length > 15) {
          console.log(`[Offline OCR] Sikeres PDF szövegfelismerés (${ocrText.length} karakter)!`);
          const parsedRecipe = parseRecipeFromHungarianText(ocrText);
          const imgBase64 = `data:image/jpeg;base64,${bestImage.toString('base64')}`;
          parsedRecipe.imageUrl = imgBase64;
          return {
            recipe: parsedRecipe,
            extractedImages: [imgBase64],
            hasPdfImage: true
          };
        }
      }
    } catch (ocrErr: any) {
      console.warn('[Offline OCR Warning]', ocrErr.message);
    }

    throw new Error('Ez a PDF egy szkennelt kép (nem tartalmaz szöveges réteget). A beolvasáshoz használd az ingyenes Google Gemini API kulcsot az alábbi kinyíló mezőben! (100%-ban INGYENES és bankkártya nélkül igényelhető az aistudio.google.com/apikey oldalon).');
  }

  if (type === 'text') {
    if (!activeAi) {
      const parsed = parseRecipeFromHungarianText(content);
      return {
        recipe: parsed,
        extractedImages: [],
        hasPdfImage: false
      };
    }

    const response = await activeAi.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: `Konvertáld recept JSON-ra: ${content}` }],
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text || '{}');
    return { recipe: parsed, extractedImages: [], hasPdfImage: false };
  }

  if (type === 'image') {
    const cleanBase64 = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const imgBuffer = Buffer.from(cleanBase64, 'base64');

    if (activeAi) {
      const response = await activeAi.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { text: 'Olvasd le a fotón lévő receptet és konvertáld JSON formátumba (title, category, description, prepTimeMinutes, cookTimeMinutes, servings, ingredients: [{name, amount, unit}], steps: [{stepNumber, instruction}]).' },
          { inlineData: { mimeType: payload.mimeType || 'image/jpeg', data: cleanBase64 } }
        ],
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text || '{}');
      return { recipe: parsed, extractedImages: [content], hasPdfImage: false };
    }

    // Try offline Tesseract OCR if no Gemini AI key is configured
    console.log('[Offline OCR] Kép észlelve, helyi OCR szövegfelismerés indítása...');
    try {
      const ocrText = await runOfflineOcr(imgBuffer);
      if (ocrText && ocrText.trim().length > 15) {
        console.log(`[Offline OCR] Sikeres fotó szövegfelismerés (${ocrText.length} karakter)!`);
        const parsedRecipe = parseRecipeFromHungarianText(ocrText);
        parsedRecipe.imageUrl = content;
        return {
          recipe: parsedRecipe,
          extractedImages: [content],
          hasPdfImage: false
        };
      }
    } catch (ocrErr: any) {
      console.warn('[Offline OCR Image Warning]', ocrErr.message);
    }

    throw new Error('A fénykép szövegének automatikus felismeréséhez add meg az ingyenes Google Gemini API kulcsot a lenti dobozban! (100%-ban INGYENES az aistudio.google.com/apikey oldalon).');
  }

  throw new Error(`A(z) ${type} típus feldolgozása nem sikerült.`);
}

export function handleExtractRecipeMiddleware(req: IncomingMessage, res: ServerResponse): void {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const result = await extractRecipeCore(payload);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (err: any) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: err.message || 'Hiba a recept beolvasásakor' }));
    }
  });
}
