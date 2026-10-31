import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
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
function tryExtractSchemaOrgRecipe(html: string, sourceUrl: string): any | null {
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
                  // Try to parse amount, unit, name
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

async function startServer() {
  const app = express();

  // Parse command line arguments for port (e.g. --port 5000 or -p 5000)
  const args = process.argv.slice(2);
  let cliPort: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      cliPort = parseInt(args[i + 1], 10);
    }
  }

  const isAiStudio = process.env.AISTUDIO === 'true' || !!process.env.DEV_SERVER_PORT || process.cwd().includes('/app/applet');
  const DEFAULT_PORT = isAiStudio ? 3000 : 5000;
  const PORT = Number(process.env.PORT) || cliPort || DEFAULT_PORT;

  // Accept up to 100MB payloads
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Middleware to catch payload errors and always return clean JSON instead of HTML
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error('[Request Error]', err.message);
      const isTooLarge = err.type === 'entity.too.large' || err.status === 413;
      return res.status(err.status || 400).json({
        success: false,
        error: isTooLarge
          ? 'A feltöltött fájl mérete túl nagy (a maximális engedélyezett méret kb. 25 MB). Kérjük válassz kisebb fájlt vagy tömörítsd a PDF-et!'
          : `Érvénytelen kérés formátum: ${err.message || 'Hiba történt a kérés beolvasásakor'}`
      });
    }
    next();
  });

  const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
  const PUBLIC_KEPEK_DIR = path.resolve(PUBLIC_DIR, 'kepek');
  if (!fs.existsSync(PUBLIC_KEPEK_DIR)) {
    fs.mkdirSync(PUBLIC_KEPEK_DIR, { recursive: true });
  }

  const PI_KEPEK_DIR = path.resolve(process.cwd(), 'uploaded_project', 'Recept adatbázis', 'static', 'kepek');
  if (!fs.existsSync(PI_KEPEK_DIR)) {
    fs.mkdirSync(PI_KEPEK_DIR, { recursive: true });
  }

  app.use('/kepek', express.static(PUBLIC_KEPEK_DIR));
  app.use('/static/kepek', express.static(PUBLIC_KEPEK_DIR));

  const UPLOAD_DIR = path.resolve(process.cwd(), 'uploaded_project');
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // API to receive files uploaded from UI
  app.post('/api/upload-files', (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array' });
      }

      let savedCount = 0;
      for (const f of files) {
        if (!f.path || f.content === undefined) continue;
        const safePath = path.normalize(f.path).replace(/^(\.\.[\/\\])+/, '');
        const fullPath = path.join(UPLOAD_DIR, safePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, f.content, 'utf-8');
        savedCount++;
      }

      return res.json({ success: true, savedCount });
    } catch (err: any) {
      console.error('Error saving files:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API to list uploaded files
  app.get('/api/uploaded-files', (req, res) => {
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        return res.json({ files: [] });
      }

      const getFilesRecursively = (dir: string, baseDir: string = ''): Array<{ name: string; path: string; size: number }> => {
        let results: Array<{ name: string; path: string; size: number }> = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          const relPath = path.join(baseDir, file);
          if (stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath, relPath));
          } else {
            results.push({ name: file, path: relPath, size: stat.size });
          }
        }
        return results;
      };

      const files = getFilesRecursively(UPLOAD_DIR);
      return res.json({ files });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API to read single file
  app.get('/api/uploaded-file', (req, res) => {
    try {
      const filePathQuery = req.query.path as string;
      if (!filePathQuery) return res.status(400).json({ error: 'path required' });
      const safePath = path.normalize(filePathQuery).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(UPLOAD_DIR, safePath);
      if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
      const content = fs.readFileSync(fullPath, 'utf-8');
      return res.json({ path: safePath, content });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API to download the complete Raspberry Pi package as ZIP
  app.get('/api/download-pi-package', (_req, res) => {
    const zipPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.0.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).send('A ZIP csomag még nem áll rendelkezésre.');
    }
    return res.download(zipPath, 'recept_adatbazis_v1.0.0.zip');
  });

  // API to download the complete Raspberry Pi package as tar.gz
  app.get('/api/download-pi-tar', (_req, res) => {
    const tarPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.0.tar.gz');
    if (!fs.existsSync(tarPath)) {
      return res.status(404).send('A tar.gz csomag még nem áll rendelkezésre.');
    }
    return res.download(tarPath, 'recept_adatbazis_v1.0.0.tar.gz');
  });

  // ============================================================================
  // RECIPESAGE-STYLE INTELLIGENT RECIPE EXTRACTOR (URL, Text, Image, PDF)
  // ============================================================================
  app.post('/api/extract-recipe', async (req, res) => {
    try {
      const { type, content, mimeType } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      let promptText = `Te egy precíz kulináris receptkinyerő asszisztens vagy (hasonlóan a RecipeSage-hez).
Elemezd a kapott forrást, és alakítsd át pontos, magyar nyelvű JSON recept objektummá a megadott sémának megfelelően.

FONTOS SZABÁLYOK:
1. A válasz KIZÁRÓLAG érvényes JSON legyen.
2. A hozzávalókat bontsd szét: 'name' (hozzávaló neve, pl. 'vöröshagyma', 'finomliszt'), 'amount' (szám, pl. 500, 2, 0.5), 'unit' (mértékegység, pl. 'g', 'dkg', 'db', 'ml', 'dl', 'ek', 'tk', 'csipet').
3. Az elkészítési lépéseket sorszámozott tömbbé ('steps') alakítsd: 'stepNumber', 'instruction', és ha az utasítás tartalmaz főzési/sütési időt, 'durationMinutes' számként.
4. Ha a kategória nem egyértelmű, válaszd a legmegfelelőbbet ezek közül: 'Főételek', 'Levesek', 'Desszertek', 'Péksütemények', 'Saláták'.

Kimeneti JSON séma:
{
  "title": "Recept címe",
  "category": "Főételek" | "Levesek" | "Desszertek" | "Péksütemények" | "Saláták",
  "description": "Rövid leírás vagy bevezető",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "servings": 4,
  "difficulty": "Könnyű" | "Közepes" | "Haladó",
  "tags": ["Családi", "Hagyományos"],
  "ingredients": [
    { "name": "Vöröshagyma", "amount": 2, "unit": "db" }
  ],
  "steps": [
    { "stepNumber": 1, "instruction": "A hagymát finomra vágjuk...", "durationMinutes": 5 }
  ],
  "notes": "Tippek és megjegyzések ha vannak",
  "imageUrl": "",
  "videoUrl": ""
}`;

      let parts: any[] = [];
      let primaryExtractedPhoto = '';
      let extractedImages: string[] = [];

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
          console.warn('URL fetch error, passing URL directly to model:', fetchErr.message);
          fetchedText = `Webcím: ${content}`;
        }

        // Try direct Schema.org / JSON-LD recipe extraction first!
        const schemaRecipe = tryExtractSchemaOrgRecipe(fetchedText, content);
        if (schemaRecipe) {
          console.log(`[Schema.org] Sikeres közvetlen recept kinyerés: "${schemaRecipe.title}" (${schemaRecipe.ingredients.length} hozzávaló, ${schemaRecipe.steps.length} lépés)`);
          return res.json({
            success: true,
            recipe: schemaRecipe,
            extractedImages: schemaRecipe.imageUrl ? [schemaRecipe.imageUrl] : [],
            hasPdfImage: false
          });
        }

        // Remove scripts and style tags to save tokens
        fetchedText = fetchedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
        fetchedText = fetchedText.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
        fetchedText = fetchedText.slice(0, 45000); // take first 45k chars

        parts.push({
          text: `${promptText}\n\nForrás weboldal URL: ${content}\n\nA weboldal tartalma:\n${fetchedText}`
        });
      } else if (type === 'text') {
        parts.push({
          text: `${promptText}\n\nKinyerendő szöveg:\n${content}`
        });
      } else if (type === 'image' || type === 'pdf') {
        const cleanBase64 = content.replace(/^data:([A-Za-z-+/]+);base64,/, '');

        if (type === 'pdf') {
          // Check inline size limit (Gemini API max inline data is 20MB)
          const approximateByteSize = Math.round(cleanBase64.length * 0.75);
          if (approximateByteSize > 18 * 1024 * 1024) {
            return res.status(400).json({
              success: false,
              error: `A PDF fájl mérete (${(approximateByteSize / (1024 * 1024)).toFixed(1)} MB) túl nagy a közvetlen feldolgozáshoz (maximum 18 MB engedélyezett). Kérjük tömörítsd a PDF-et vagy töltsd fel a recept képét/szövegét!`
            });
          }
          console.log(`[PDF Extraction] PDF sikeresen átadva a modellnek szöveg és receptstruktúra kinyeréséhez (${(approximateByteSize / (1024 * 1024)).toFixed(2)} MB).`);
        } else if (type === 'image') {
          // Direct uploaded image - save to /kepek to avoid giant base64 strings in DB
          try {
            const imgBuffer = Buffer.from(cleanBase64, 'base64');
            const isPng = (mimeType || '').includes('png');
            const ext = isPng ? 'png' : 'jpg';
            const fileName = `foto_recept_${Date.now()}.${ext}`;
            const publicFilePath = path.join(PUBLIC_KEPEK_DIR, fileName);
            fs.writeFileSync(publicFilePath, imgBuffer);

            if (fs.existsSync(PI_KEPEK_DIR)) {
              fs.writeFileSync(path.join(PI_KEPEK_DIR, fileName), imgBuffer);
            }
            primaryExtractedPhoto = `/kepek/${fileName}`;
            extractedImages = [primaryExtractedPhoto];
          } catch {
            primaryExtractedPhoto = content.startsWith('data:')
              ? content
              : `data:${mimeType || 'image/jpeg'};base64,${cleanBase64}`;
            extractedImages = [primaryExtractedPhoto];
          }
        }

        parts.push({
          text: `${promptText}\n\nKérlek olvasd le a csatolt képről/dokumentumról a receptet és konvertáld a megadott JSON formátumra.`
        });
        parts.push({
          inlineData: {
            mimeType: mimeType || (type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
            data: cleanBase64
          }
        });
      } else {
        return res.status(400).json({ error: 'Invalid extraction type' });
      }

      // Check if AI is initialized (has GEMINI_API_KEY)
      if (!ai) {
        return res.status(400).json({
          success: false,
          error: type === 'url'
            ? 'A megadott weboldal nem tartalmazott szabványos recept-adatot. AI-alapú intelligens értelmezéshez kérlek add meg a GEMINI_API_KEY kulcsot a .env fájlban!'
            : 'A fényképek és PDF fájlok beolvasásához Google Gemini API kulcs szükséges a .env fájlban (GEMINI_API_KEY=...). A legtöbb weboldalról (pl. Nosalty, Mindmegette) a receptek URL alapján kulcs nélkül is automatikusan beolvashatók!'
        });
      }

      // Robust Multi-Model Fallback & Retry mechanism for 503 / 429 transient spikes
      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let responseText = '';
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            console.log(`Extracting recipe with model ${modelName} (attempt ${attempt + 1})...`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: parts,
              config: {
                responseMimeType: 'application/json'
              }
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            const errStr = String(modelErr.message || '');
            console.warn(`Model ${modelName} attempt ${attempt + 1} failed: ${errStr}`);
            if (errStr.includes('503') || errStr.includes('429') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE')) {
              // Wait briefly before retrying or switching model
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            } else {
              break; // Not a transient overload, try next model
            }
          }
        }
        if (responseText) break;
      }

      if (!responseText) {
        throw lastError || new Error('A modell jelenleg túlterhelt, kérlek próbáld újra egy pillanat múlva!');
      }
      let parsedRecipe: any = {};
      try {
        parsedRecipe = JSON.parse(responseText);
      } catch (jsonErr) {
        // Match JSON block with regex if output was surrounded by markdown
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedRecipe = JSON.parse(match[0]);
        } else {
          throw new Error('A modell válasza nem volt érvényes JSON formátum');
        }
      }

      // Automatically incorporate the extracted photo into the recipe if found
      if (!parsedRecipe.imageUrl && primaryExtractedPhoto) {
        parsedRecipe.imageUrl = primaryExtractedPhoto;
      }

      // Add unique IDs to ingredients
      if (Array.isArray(parsedRecipe.ingredients)) {
        parsedRecipe.ingredients = parsedRecipe.ingredients.map((ing: any, idx: number) => ({
          id: `ing-${Date.now()}-${idx}`,
          name: ing.name || '',
          amount: Number(ing.amount) || 1,
          unit: ing.unit || 'adag'
        }));
      } else {
        parsedRecipe.ingredients = [];
      }

      // Ensure steps structure
      if (Array.isArray(parsedRecipe.steps)) {
        parsedRecipe.steps = parsedRecipe.steps.map((st: any, idx: number) => ({
          stepNumber: idx + 1,
          instruction: typeof st === 'string' ? st : st.instruction || '',
          durationMinutes: typeof st === 'object' ? Number(st.durationMinutes) || undefined : undefined
        }));
      } else {
        parsedRecipe.steps = [];
      }

      return res.json({
        success: true,
        recipe: parsedRecipe,
        extractedImages,
        hasPdfImage: extractedImages.length > 0 && type === 'pdf'
      });
    } catch (err: any) {
      console.error('Extraction error:', err);
      return res.status(500).json({
        error: `Sikertelen kinyerés: ${err.message || 'Hiba történt a feldolgozás során'}`
      });
    }
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  const distIndex = path.resolve(distPath, 'index.html');
  const isProductionMode = process.env.NODE_ENV === 'production' || (!isAiStudio && fs.existsSync(distIndex));

  if (isProductionMode && fs.existsSync(distIndex)) {
    console.log(`[Production] Statikus fájlok kiszolgálása a(z) ${distPath} mappából`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    console.log(`[Development] Vite dev szerver middleware csatolva`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Családi Receptkönyv szerver fut: http://0.0.0.0:${PORT}`);
  });
}

startServer();
