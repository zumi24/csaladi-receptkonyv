import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { extractRecipeCore } from './recipeExtractor.ts';

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

  // In AI Studio / preview container, the dev server must always run on port 3000.
  // When running locally on Raspberry Pi or user's host, default to 5000 (or cliPort / process.env.PORT).
  const isAiStudio = process.cwd().includes('/app/applet') || process.env.AISTUDIO === 'true' || !!process.env.DEV_SERVER_PORT;
  let PORT = 3000;
  if (isAiStudio) {
    PORT = 3000;
  } else {
    PORT = cliPort || (process.env.PORT ? Number(process.env.PORT) : 5000);
  }

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
    const zipPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.7.zip');
    const fallbackPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.6.zip');
    const finalPath = fs.existsSync(zipPath) ? zipPath : (fs.existsSync(fallbackPath) ? fallbackPath : path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.5.zip'));
    if (!fs.existsSync(finalPath)) {
      return res.status(404).send('A ZIP csomag még nem áll rendelkezésre.');
    }
    return res.download(finalPath, 'recept_adatbazis_v1.0.7.zip');
  });

  // API to download the complete Raspberry Pi package as tar.gz
  app.get('/api/download-pi-tar', (_req, res) => {
    const tarPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.7.tar.gz');
    const fallbackPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.6.tar.gz');
    const finalPath = fs.existsSync(tarPath) ? tarPath : (fs.existsSync(fallbackPath) ? fallbackPath : path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.5.tar.gz'));
    if (!fs.existsSync(finalPath)) {
      return res.status(404).send('A tar.gz csomag még nem áll rendelkezésre.');
    }
    return res.download(finalPath, 'recept_adatbazis_v1.0.7.tar.gz');
  });

  // API to fetch base64 tar.gz package (immune to iframe download blocks)
  app.get('/api/package-base64', (_req, res) => {
    const tarPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.7.tar.gz');
    const fallbackPath = path.resolve(PUBLIC_DIR, 'recept_adatbazis_v1.0.6.tar.gz');
    const finalPath = fs.existsSync(tarPath) ? tarPath : fallbackPath;
    if (!fs.existsSync(finalPath)) {
      return res.status(404).json({ error: 'A csomag nem található' });
    }
    const buffer = fs.readFileSync(finalPath);
    const base64 = buffer.toString('base64');
    return res.json({
      success: true,
      filename: 'recept_adatbazis_v1.0.7.tar.gz',
      size: buffer.length,
      base64
    });
  });

  // API to fetch raw source code of key project files for direct clipboard copying
  app.get('/api/get-source-code', (req, res) => {
    const allowed = ['server.ts', 'recipeExtractor.ts', 'package.json', 'setup_pi.sh', 'receptkonyv.service'];
    const file = req.query.file as string;
    if (!file || !allowed.includes(file)) {
      return res.status(400).json({ error: 'Fájl nem engedélyezett' });
    }
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Fájl nem található' });
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return res.json({ success: true, file, content });
  });

  // API to save Gemini API key directly from UI to .env file
  app.post('/api/save-api-key', (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ error: 'Érvénytelen API kulcs formátum' });
      }
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${apiKey.trim()}\n`;
      }
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      process.env.GEMINI_API_KEY = apiKey.trim();
      console.log('✅ GEMINI_API_KEY sikeresen elmentve a .env fájlba!');
      return res.json({ success: true, message: 'API kulcs sikeresen elmentve a Pi-re!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ============================================================================
  // RECIPESAGE-STYLE INTELLIGENT RECIPE EXTRACTOR (URL, Text, Image, PDF)
  // ============================================================================
  app.post('/api/extract-recipe', async (req, res) => {
    try {
      const result = await extractRecipeCore(req.body);
      return res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error('Extraction error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Hiba történt a recept feldolgozása során.'
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
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Családi Receptkönyv szerver fut: http://0.0.0.0:${PORT}`);
  });
}

startServer();
