import { Recipe } from '../types';

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateRecipePrintHtml(
  recipe: Recipe,
  withImage: boolean,
  servingsMultiplier: number = 1
): string {
  const scaledServings = Math.round(recipe.servings * servingsMultiplier);

  // Scaled Ingredients
  const ingredientsHtml = (recipe.ingredients || [])
    .map((ing) => {
      const scaled = ing.amount * servingsMultiplier;
      const formattedAmount =
        scaled > 0 ? (scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1)) : '';
      return `
      <li class="ing-item">
        <span class="ing-checkbox"></span>
        <span class="ing-amount">${escapeHtml(formattedAmount)} ${escapeHtml(ing.unit || '')}</span>
        <span class="ing-name">${escapeHtml(ing.name)}</span>
      </li>
    `;
    })
    .join('');

  // Numbered Steps
  const stepsHtml = (recipe.steps || [])
    .map(
      (st) => `
    <li class="step-item">
      <span class="step-number">${st.stepNumber}</span>
      <div class="step-content">
        <div class="step-text">${escapeHtml(st.instruction)}</div>
        ${
          st.durationMinutes && st.durationMinutes > 0
            ? `<div class="step-time">⏱️ Időtartam: ${st.durationMinutes} perc</div>`
            : ''
        }
      </div>
    </li>
  `
    )
    .join('');

  // Optional food photo only (NO videos, NO web widgets, NO ads)
  const imageHtml =
    withImage && recipe.imageUrl
      ? `
    <div class="recipe-photo-container">
      <img src="${escapeHtml(recipe.imageUrl)}" alt="${escapeHtml(recipe.title)}" class="recipe-photo" />
    </div>
  `
      : '';

  const notesHtml = recipe.notes
    ? `
    <div class="notes-box">
      <strong>💡 Családi konyhai tipp / Megjegyzés:</strong>
      <p>${escapeHtml(recipe.notes)}</p>
    </div>
  `
    : '';

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(recipe.title)} - Recept Nyomtatás</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 15mm 14mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      font-size: 13px;
    }
    .print-actions-bar {
      margin-bottom: 24px;
      padding: 12px 16px;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .print-actions-bar strong {
      color: #92400e;
      font-size: 13px;
    }
    .print-btn {
      background: #d97706;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #b45309;
    }
    .close-btn {
      background: #e5e7eb;
      color: #374151;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }
    .close-btn:hover {
      background: #d1d5db;
    }
    @media print {
      body {
        padding: 0 !important;
      }
      .no-print, .print-actions-bar {
        display: none !important;
      }
    }
    .header-section {
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .header-text {
      flex: 1;
    }
    .category-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #b45309;
      margin-bottom: 4px;
    }
    h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      line-height: 1.2;
    }
    .description {
      margin: 0 0 10px 0;
      font-size: 12px;
      color: #4b5563;
      font-style: italic;
      line-height: 1.4;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      font-size: 11.5px;
      font-weight: 700;
      color: #374151;
      background: #f9fafb;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      margin-top: 6px;
    }
    .recipe-photo-container {
      width: 140px;
      height: 105px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #d1d5db;
      background: #f3f4f6;
    }
    .recipe-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid #111827;
      padding-bottom: 4px;
      margin: 18px 0 10px 0;
      color: #111827;
    }
    .ingredients-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 24px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .ing-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 0;
      border-bottom: 1px dotted #e5e7eb;
      font-size: 12px;
      break-inside: avoid;
    }
    .ing-checkbox {
      width: 12px;
      height: 12px;
      border: 1.2px solid #6b7280;
      border-radius: 2px;
      flex-shrink: 0;
      display: inline-block;
    }
    .ing-amount {
      font-weight: 700;
      color: #111827;
      min-width: 65px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .ing-name {
      color: #1f2937;
      flex: 1;
    }
    .steps-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      line-height: 1.5;
      break-inside: avoid;
    }
    .step-number {
      font-weight: 800;
      color: #111827;
      width: 22px;
      height: 22px;
      border: 1.2px solid #4b5563;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10.5px;
      flex-shrink: 0;
      background: #f9fafb;
    }
    .step-content {
      flex: 1;
    }
    .step-text {
      color: #111827;
    }
    .step-time {
      font-size: 11px;
      font-weight: 600;
      color: #b45309;
      margin-top: 2px;
    }
    .notes-box {
      margin-top: 16px;
      padding: 10px 14px;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 11.5px;
      color: #374151;
      break-inside: avoid;
    }
    .notes-box strong {
      display: block;
      margin-bottom: 2px;
      color: #111827;
    }
    .notes-box p {
      margin: 0;
    }
    .footer-bar {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="print-actions-bar no-print">
    <div>
      <strong>🖨️ Recept Nyomtatása</strong>
      <span style="font-size: 12px; color: #4b5563; margin-left: 8px;">Kizárólag a recept lényegi adatai kerülnek a papírra.</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn" onclick="window.print()">🖨️ Nyomtatás most</button>
      <button class="close-btn" onclick="window.close()">Bezárás</button>
    </div>
  </div>

  <div class="header-section">
    <div class="header-text">
      <div class="category-badge">${escapeHtml(recipe.category)} &middot; ${escapeHtml(recipe.difficulty)}</div>
      <h1>${escapeHtml(recipe.title)}</h1>
      ${recipe.description ? `<p class="description">${escapeHtml(recipe.description)}</p>` : ''}
      <div class="meta-pills">
        <span>⏱️ Előkészítés: ${recipe.prepTimeMinutes} perc</span>
        <span>🔥 Főzés/Sütés: ${recipe.cookTimeMinutes} perc</span>
        <span>🍽️ Adag: ${scaledServings} személyre</span>
        ${recipe.chef ? `<span>👨‍🍳 Szakács: ${escapeHtml(recipe.chef)}</span>` : ''}
      </div>
    </div>
    ${imageHtml}
  </div>

  <div class="section-title">Hozzávalók (${scaledServings} adaghoz):</div>
  <ul class="ingredients-grid">
    ${ingredientsHtml}
  </ul>

  <div class="section-title">Elkészítés lépései:</div>
  <ol class="steps-list">
    ${stepsHtml}
  </ol>

  ${notesHtml}

  <div class="footer-bar">
    <span>Családi Receptkönyv</span>
    <span>Kinyomtatva: ${new Date().toLocaleDateString('hu-HU')}</span>
  </div>

  <script>
    // Trigger automatic print after content and potential images have rendered
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print failed:', e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;
}

/**
 * Execute recipe print:
 * Mode 'direct' -> injects dedicated hidden iframe and triggers iframe.print()
 * Mode 'new-tab' -> opens clean HTML in new tab and triggers window.print()
 */
export function executeRecipePrint(
  recipe: Recipe,
  withImage: boolean,
  servingsMultiplier: number = 1,
  mode: 'direct' | 'new-tab' = 'direct'
): boolean {
  const htmlDoc = generateRecipePrintHtml(recipe, withImage, servingsMultiplier);

  if (mode === 'new-tab') {
    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.open();
      newWin.document.write(htmlDoc);
      newWin.document.close();
      return true;
    }
  }

  // Direct printing via invisible iframe (works inside iframes and main browser)
  try {
    let iframe = document.getElementById('recipe-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'recipe-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '10px';
      iframe.style.height = '10px';
      iframe.style.opacity = '0';
      iframe.style.border = 'none';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && iframe.contentWindow) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.open', err);
          const fallbackWin = window.open('', '_blank');
          if (fallbackWin) {
            fallbackWin.document.open();
            fallbackWin.document.write(htmlDoc);
            fallbackWin.document.close();
          }
        }
      }, 350);

      return true;
    }
  } catch (err) {
    console.warn('Direct iframe creation error, falling back to new window:', err);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(htmlDoc);
      win.document.close();
      return true;
    }
  }

  return false;
}
