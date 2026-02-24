// ── CONFIG ────────────────────────────────────────────────────────────────────
// Add your recipe JSON filenames here. Each file lives in recipes/
const RECIPE_FILES = [
  'shakshuka.json',
  'autumn-salad.json',
  'coconut-miso-salmon-curry.json',
  'one-pot-beans-greens-grains.json',
  // Add more here as you export them from the Add Recipe form
];

// ── FAVORITES ─────────────────────────────────────────────────────────────────
const FAV_KEY = 'whatcanicook_favorites';

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || {}; }
  catch { return {}; }
}

function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function isFavorite(id) { return !!loadFavorites()[id]; }

function toggleFavorite(recipe) {
  const favs = loadFavorites();
  if (favs[recipe.id]) delete favs[recipe.id];
  else favs[recipe.id] = recipe;
  saveFavorites(favs);
  return !!favs[recipe.id];
}

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

// ── STATE ─────────────────────────────────────────────────────────────────────
let allRecipes  = [];
let showingFavs = false;
let searchTimeout = null;

// ── RENDER CARDS ──────────────────────────────────────────────────────────────
function renderCards(recipes, noResults = false) {
  const container = document.getElementById('recipe-cards');
  container.innerHTML = '';

  if (noResults || !recipes.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:2.5rem">${showingFavs ? '⭐' : '🔍'}</div>
        <p>${showingFavs
          ? 'No favorites yet — hit ⭐ on any recipe to save it!'
          : 'No recipes match your search.'}</p>
      </div>`;
    return;
  }

  recipes.forEach((recipe, i) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const fav  = isFavorite(recipe.id);
    const tags = [recipe.meal, recipe.cuisine].filter(Boolean).join(' · ');
    const imgSrc = recipe.image ? `images/${recipe.image}` : '';
    const complexity = recipe.complexity
      ? '★'.repeat(recipe.complexity) + '☆'.repeat(5 - recipe.complexity)
      : '';

    card.innerHTML = `
      <div class="card-img-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${recipe.name}" onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>🍽️</div>'">`
          : `<div class="card-img-placeholder">🍽️</div>`}
        <button class="fav-btn ${fav ? 'fav-active' : ''}" data-id="${recipe.id}" aria-label="Favourite">⭐</button>
      </div>
      <div class="card-body">
        ${tags ? `<span class="meal-tag">${tags}</span>` : ''}
        <h2>${recipe.name}</h2>
        <div class="card-meta">
          <span>🥄 ${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? 's' : ''}</span>
          ${recipe.cookTime    ? `<span>⏱ ${recipe.cookTime} min</span>` : ''}
          ${complexity ? `<span title="Complexity">${complexity}</span>` : ''}
        </div>
        <button class="btn btn-primary">View Recipe</button>
      </div>`;

    card.querySelector('.fav-btn').addEventListener('click', e => {
      e.stopPropagation();
      const isNowFav = toggleFavorite(recipe);
      e.currentTarget.classList.toggle('fav-active', isNowFav);
      if (showingFavs && !isNowFav) card.remove();
    });

    card.querySelector('.btn').addEventListener('click', e => { e.stopPropagation(); openModal(recipe); });
    card.addEventListener('click', () => openModal(recipe));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(recipe); });

    container.appendChild(card);
  });
}

function setLoading() {
  document.getElementById('recipe-cards').innerHTML = `
    <div class="empty-state"><div style="font-size:2rem">⏳</div><p>Loading recipes...</p></div>`;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(recipe) {
  const overlay  = document.getElementById('modal-overlay');
  const inner    = document.getElementById('modal-inner');
  const fav      = isFavorite(recipe.id);
  const imgSrc   = recipe.image ? `images/${recipe.image}` : '';
  const complexity = recipe.complexity
    ? '★'.repeat(recipe.complexity) + '☆'.repeat(5 - recipe.complexity)
    : '';

  const ingredientsHtml = recipe.ingredients && recipe.ingredients.length
    ? `<h3 class="section-title">Ingredients</h3>
       <ul class="ingredients-list">
         ${recipe.ingredients.map(ing => `
           <li><span>${ing.name}</span>
           ${ing.quantity ? `<span class="ingredient-qty">${ing.quantity}</span>` : ''}</li>`).join('')}
       </ul>`
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
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button class="fav-btn ${fav ? 'fav-active' : ''}" id="modal-fav-btn" aria-label="Favourite">⭐</button>
          <button class="modal-close" id="modal-close-btn" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="modal-meta">
        ${recipe.meal     ? `<span>🍽️ ${recipe.meal}</span>`      : ''}
        ${recipe.cuisine  ? `<span>🌍 ${recipe.cuisine}</span>`    : ''}
        ${recipe.cookTime    ? `<span>⏱ ${recipe.cookTime} min</span>` : ''}
        ${recipe.servings ? `<span>👥 Serves ${recipe.servings}</span>` : ''}
        ${complexity      ? `<span title="Complexity">${complexity}</span>` : ''}
      </div>
      ${ingredientsHtml}
      ${stepsHtml}
      ${recipe.source ? `<div style="margin-top:1rem;"><a href="${recipe.source}" target="_blank" class="btn btn-outline">🔗 Original Recipe</a></div>` : ''}
    </div>`;

  document.getElementById('modal-fav-btn').addEventListener('click', e => {
    const isNowFav = toggleFavorite(recipe);
    e.currentTarget.classList.toggle('fav-active', isNowFav);
    const cardBtn = document.querySelector(`.fav-btn[data-id="${recipe.id}"]`);
    if (cardBtn) cardBtn.classList.toggle('fav-active', isNowFav);
  });

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

// ── SEARCH & FILTER ───────────────────────────────────────────────────────────
function applyFilters() {
  if (showingFavs) return;
  const query    = document.getElementById('search').value.toLowerCase().trim();
  const mealType = document.getElementById('meal-type-filter').value;
  const cuisine  = document.getElementById('cuisine-filter').value;

  const filtered = allRecipes.filter(r => {
    const matchSearch  = !query    || r.name.toLowerCase().includes(query);
    const matchMeal    = !mealType || r.meal    === mealType;
    const matchCuisine = !cuisine  || r.cuisine === cuisine;
    return matchSearch && matchMeal && matchCuisine;
  });

  renderCards(filtered, filtered.length === 0 && (query || mealType || cuisine));
}

document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 200);
});
document.getElementById('meal-type-filter').addEventListener('change', applyFilters);
document.getElementById('cuisine-filter').addEventListener('change', applyFilters);

// ── FAVORITES TOGGLE ──────────────────────────────────────────────────────────
document.getElementById('fav-toggle').addEventListener('click', () => {
  showingFavs = !showingFavs;
  const btn = document.getElementById('fav-toggle');
  btn.classList.toggle('fav-toggle-active', showingFavs);
  btn.textContent = showingFavs ? '⭐ Favorites' : '☆ Favorites';
  if (showingFavs) renderCards(Object.values(loadFavorites()));
  else applyFilters();
});

// ── EXPORT FAVORITES ──────────────────────────────────────────────────────────
document.getElementById('export-favs').addEventListener('click', () => {
  const favs = loadFavorites();
  if (!Object.keys(favs).length) { alert('No favorites to export yet!'); return; }
  const blob = new Blob([JSON.stringify(favs, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'favorites.json'; a.click();
  URL.revokeObjectURL(url);
});

// ── INIT ──────────────────────────────────────────────────────────────────────
(async () => {
  setLoading();
  allRecipes = await fetchAllRecipes();
  renderCards(allRecipes);
})();
