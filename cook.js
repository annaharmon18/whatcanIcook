// ── CONFIG ────────────────────────────────────────────────────────────────────
const RECIPE_FILES = [
  'oatmeal.json',
  'shakshouka.json',
  // Keep in sync with recipes.js
];

// ── FETCH ─────────────────────────────────────────────────────────────────────
async function fetchAllRecipes() {
  const results = await Promise.allSettled(
    RECIPE_FILES.map(file =>
      fetch(`recipes/${file}`).then(r => {
        if (!r.ok) throw new Error(`Failed: ${file}`);
        return r.json();
      })
    )
  );
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

// ── FAVORITES ─────────────────────────────────────────────────────────────────
function loadFavorites() {
  try { return Object.values(JSON.parse(localStorage.getItem('whatcanicook_favorites')) || {}); }
  catch { return []; }
}

// ── PANTRY ────────────────────────────────────────────────────────────────────
function loadPantry() {
  try {
    const raw = JSON.parse(localStorage.getItem('whatcanicook_pantry')) || [];
    return raw.map(item =>
      typeof item === 'string' ? { name: item, quantity: '' } : item
    );
  } catch { return []; }
}

// ── MATCHING ──────────────────────────────────────────────────────────────────
const STAPLES = ['water', 'salt', 'pepper', 'oil', 'olive oil'];

function ingredientMatches(pantryName, recipeName) {
  const a = pantryName.toLowerCase().trim();
  const b = recipeName.toLowerCase().trim();
  return b.includes(a) || a.includes(b);
}

function matchRecipe(recipe, pantryItems) {
  const ingredients = recipe.ingredients || [];
  if (!ingredients.length) return { matched: [], missing: [], score: 0 };
  const matched = [], missing = [];
  ingredients.forEach(ing => {
    const isStaple = STAPLES.some(s => ing.name.toLowerCase().includes(s));
    const found    = isStaple || pantryItems.some(p => ingredientMatches(p.name, ing.name));
    if (found) matched.push(ing); else missing.push(ing);
  });
  return { matched, missing, score: Math.round((matched.length / ingredients.length) * 100) };
}

// ── PANTRY SUMMARY ────────────────────────────────────────────────────────────
function renderPantrySummary(pantryItems) {
  const el = document.getElementById('pantry-summary');
  if (!pantryItems.length) {
    el.innerHTML = `
      <div class="summary-banner summary-empty">
        <span>🛒</span>
        <div>
          <strong>Your pantry is empty.</strong>
          <p>Add ingredients on the <a href="pantry.html">Pantry page</a> to see matches.</p>
        </div>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="summary-banner">
      <span>🥕</span>
      <div>
        <strong>${pantryItems.length} ingredient${pantryItems.length !== 1 ? 's' : ''} in your pantry</strong>
        <p>${pantryItems.map(p => p.name).join(', ')}</p>
      </div>
      <a href="pantry.html" class="btn btn-outline" style="flex-shrink:0;">Edit Pantry</a>
    </div>`;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderResults(scoredRecipes) {
  const container = document.getElementById('cook-results');
  if (!scoredRecipes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem">🍽️</div>
        <p>No recipes yet. <a href="add-recipe.html" style="color:var(--terracotta);">Add some recipes</a> to get started!</p>
      </div>`;
    return;
  }
  const canMake   = scoredRecipes.filter(r => r.score === 100);
  const almostAll = scoredRecipes.filter(r => r.score >= 50 && r.score < 100);
  const needMore  = scoredRecipes.filter(r => r.score < 50);

  container.innerHTML = '';
  if (canMake.length)   renderGroup(container, '✅ Ready to Cook',         canMake,   'tier-ready');
  if (almostAll.length) renderGroup(container, '🟡 Almost There',          almostAll, 'tier-almost');
  if (needMore.length)  renderGroup(container, '🛒 Need More Ingredients', needMore,  'tier-need');
}

function renderGroup(container, title, recipes, tierClass) {
  const section = document.createElement('div');
  section.className = `cook-group ${tierClass}`;
  section.innerHTML = `<h2 class="cook-group-title">${title}</h2>`;
  const grid = document.createElement('div');
  grid.className = 'cook-grid';

  recipes.forEach((r, i) => {
    const card  = document.createElement('div');
    card.className = 'cook-card';
    card.style.animationDelay = `${i * 0.06}s`;
    const total = r.matched.length + r.missing.length;
    const imgSrc = r.recipe.image ? `images/${r.recipe.image}` : '';

    const missingHtml = r.missing.length
      ? `<div class="missing-list">
           <span class="missing-label">Still need:</span>
           ${r.missing.slice(0, 4).map(ing => `<span class="missing-tag">${ing.name}</span>`).join('')}
           ${r.missing.length > 4 ? `<span class="missing-tag">+${r.missing.length - 4} more</span>` : ''}
         </div>`
      : `<div class="missing-list"><span class="missing-label all-good">You have everything! 🎉</span></div>`;

    card.innerHTML = `
      <div class="card-img-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${r.recipe.name}" onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>🍽️</div>'">`
          : `<div class="card-img-placeholder">🍽️</div>`}
        <div class="score-badge score-${scoreClass(r.score)}">${r.score}%</div>
      </div>
      <div class="card-body">
        ${r.recipe.meal ? `<span class="meal-tag">${r.recipe.meal}</span>` : ''}
        <h3>${r.recipe.name}</h3>
        <div class="ingredient-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${r.score}%"></div></div>
          <span class="progress-label">${r.matched.length} / ${total} ingredients</span>
        </div>
        ${missingHtml}
        <button class="btn btn-primary" style="margin-top:0.75rem;">View Recipe</button>
      </div>`;

    card.querySelector('.btn').addEventListener('click', () => openModal(r.recipe, r.matched, r.missing));
    card.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') openModal(r.recipe, r.matched, r.missing); });
    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.appendChild(section);
}

function scoreClass(score) {
  if (score === 100) return 'full';
  if (score >= 50)   return 'mid';
  return 'low';
}

function renderFavorites(pantryItems) {
  const favs = loadFavorites();
  if (!favs.length) return;
  const scored = favs
    .map(recipe => ({ recipe, ...matchRecipe(recipe, pantryItems) }))
    .sort((a, b) => b.score - a.score);
  const container = document.getElementById('cook-results');
  const section   = document.createElement('div');
  section.className = 'cook-group';
  section.innerHTML = `<h2 class="cook-group-title">⭐ Your Favorites</h2>`;
  const grid = document.createElement('div');
  grid.className = 'cook-grid';

  scored.forEach((r, i) => {
    const card  = document.createElement('div');
    card.className = 'cook-card';
    card.style.animationDelay = `${i * 0.06}s`;
    const total  = r.matched.length + r.missing.length;
    const imgSrc = r.recipe.image ? `images/${r.recipe.image}` : '';

    card.innerHTML = `
      <div class="card-img-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${r.recipe.name}" onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>🍽️</div>'">`
          : `<div class="card-img-placeholder">🍽️</div>`}
        <div class="score-badge score-${scoreClass(r.score)}">${r.score}%</div>
      </div>
      <div class="card-body">
        ${r.recipe.meal ? `<span class="meal-tag">${r.recipe.meal}</span>` : ''}
        <h3>${r.recipe.name}</h3>
        <div class="ingredient-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${r.score}%"></div></div>
          <span class="progress-label">${r.matched.length} / ${total} ingredients</span>
        </div>
        <button class="btn btn-primary" style="margin-top:0.75rem;">View Recipe</button>
      </div>`;

    card.querySelector('.btn').addEventListener('click', () => openModal(r.recipe, r.matched, r.missing));
    card.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') openModal(r.recipe, r.matched, r.missing); });
    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.insertBefore(section, container.firstChild);
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(recipe, matched, missing) {
  const overlay = document.getElementById('modal-overlay');
  const inner   = document.getElementById('modal-inner');
  const imgSrc  = recipe.image ? `images/${recipe.image}` : '';
  const complexity = recipe.complexity
    ? '★'.repeat(recipe.complexity) + '☆'.repeat(5 - recipe.complexity) : '';

  const ingredientsHtml = recipe.ingredients && recipe.ingredients.length
    ? `<h3 class="section-title">Ingredients</h3>
       <ul class="ingredients-list">
         ${recipe.ingredients.map(ing => {
           const isMatched = matched.some(m => m.name === ing.name);
           return `<li class="${isMatched ? 'ing-have' : 'ing-missing'}">
             <span>${ing.name}</span>
             ${ing.quantity ? `<span class="ingredient-qty">${ing.quantity}</span>` : ''}
           </li>`;
         }).join('')}
       </ul>
       <div class="ing-legend">
         <span class="legend-dot dot-have"></span> Have it &nbsp;
         <span class="legend-dot dot-missing"></span> Need it
       </div>`
    : '';

  const stepsHtml = recipe.instructions && recipe.instructions.length
    ? `<h3 class="section-title">Instructions</h3>
       <ol class="steps-list">
         ${recipe.instructions.map(s => `<li>${s}</li>`).join('')}
       </ol>`
    : '';

  inner.innerHTML = `
    ${imgSrc
      ? `<img class="modal-img" src="${imgSrc}" alt="${recipe.name}" onerror="this.outerHTML='<div class=\\'modal-img-placeholder\\'>🍽️</div>'">`
      : `<div class="modal-img-placeholder">🍽️</div>`}
    <div class="modal-content">
      <div class="modal-top">
        <h2>${recipe.name}</h2>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="modal-meta">
        ${recipe.meal     ? `<span>🍽️ ${recipe.meal}</span>`         : ''}
        ${recipe.cuisine  ? `<span>🌍 ${recipe.cuisine}</span>`       : ''}
        ${recipe.cookTime    ? `<span>⏱ ${recipe.cookTime} min</span>`   : ''}
        ${recipe.servings ? `<span>👥 Serves ${recipe.servings}</span>` : ''}
        ${complexity      ? `<span>${complexity}</span>`              : ''}
        <span>🥄 ${matched.length}/${matched.length + missing.length} ingredients on hand</span>
      </div>
      ${ingredientsHtml}
      ${stepsHtml}
      ${recipe.source ? `<div style="margin-top:1rem;"><a href="${recipe.source}" target="_blank" class="btn btn-outline">🔗 Original Recipe</a></div>` : ''}
    </div>`;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── INIT ──────────────────────────────────────────────────────────────────────
(async () => {
  const pantryItems = loadPantry();
  renderPantrySummary(pantryItems);

  document.getElementById('cook-results').innerHTML = `
    <div class="empty-state"><div style="font-size:2rem">⏳</div><p>Checking your pantry...</p></div>`;

  const recipes = await fetchAllRecipes();
  const scored  = recipes
    .map(recipe => ({ recipe, ...matchRecipe(recipe, pantryItems) }))
    .sort((a, b) => b.score - a.score);

  renderResults(scored);
  renderFavorites(pantryItems);
})();
