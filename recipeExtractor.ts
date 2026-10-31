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

export async function extractRecipeCore(payload: { type: string; content: string; mimeType?: string }): Promise<any> {
  const { type, content } = payload;
  if (!content) {
    throw new Error('A bemeneti tartalom kötelező!');
  }

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
    if (!ai) {
      const basicRecipe = extractBasicHtmlRecipe(fetchedText, content);
      if (basicRecipe) {
        return {
          recipe: basicRecipe,
          extractedImages: basicRecipe.imageUrl ? [basicRecipe.imageUrl] : [],
          hasPdfImage: false
        };
      }
      throw new Error('A megadott weboldal nem tartalmazott közvetlenül értelmezhető recept-adatot. AI-alapú elemzéshez adj meg GEMINI_API_KEY kulcsot a .env fájlban!');
    }

    // 3. Fallback to Gemini AI with clean HTML
    fetchedText = fetchedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    fetchedText = fetchedText.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    fetchedText = fetchedText.slice(0, 40000);

    const prompt = `Kérlek alakítsd át az alábbi weboldalt érvényes JSON receptté (title, category, description, prepTimeMinutes, cookTimeMinutes, servings, ingredients: [{name, amount, unit}], steps: [{stepNumber, instruction}], imageUrl).\nWebcím: ${content}\n\nTartalom:\n${fetchedText}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text || '{}');
    return { recipe: parsed, extractedImages: parsed.imageUrl ? [parsed.imageUrl] : [], hasPdfImage: false };
  }

  if (type === 'text') {
    if (!ai) {
      // Simple text heuristic parser
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const title = lines[0] || 'Beillesztett recept';
      const steps = lines.slice(1).map((l, i) => ({ stepNumber: i + 1, instruction: l }));
      return {
        recipe: {
          title,
          category: 'Főételek',
          description: '',
          prepTimeMinutes: 15,
          cookTimeMinutes: 30,
          servings: 4,
          difficulty: 'Könnyű',
          tags: ['Szövegből'],
          ingredients: [{ id: `ing-${Date.now()}-1`, name: 'Hozzávalók a leírásban', amount: 1, unit: 'adag' }],
          steps,
          imageUrl: ''
        },
        extractedImages: [],
        hasPdfImage: false
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: `Konvertáld recept JSON-ra: ${content}` }],
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text || '{}');
    return { recipe: parsed, extractedImages: [], hasPdfImage: false };
  }

  throw new Error(`A(z) ${type} típushoz GEMINI_API_KEY kulcs beállítása szükséges a .env fájlban.`);
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
