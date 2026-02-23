// ── MEASUREMENTS ──────────────────────────────────────────────────────────────
const MEASUREMENTS = [
  // Volume
  'tsp', 'tbsp', 'fl oz', 'cup', 'pint', 'quart', 'gallon',
  // Weight
  'oz', 'lb', 'g', 'kg',
  // Common cooking
  'ml', 'l', 'pinch', 'dash', 'handful', 'clove', 'slice', 'piece', 'can', 'package',
  // None
  'to taste', '',
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let complexity   = 0;
let imageFilename = '';

// ── STAR RATING ───────────────────────────────────────────────────────────────
document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('click', () => {
    complexity = parseInt(star.dataset.value);
    document.getElementById('recipe-complexity').value = complexity;
    updateStars();
    updatePreview();
  });

  star.addEventListener('mouseover', () => {
    const val = parseInt(star.dataset.value);
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('star-hover', parseInt(s.dataset.value) <= val);
    });
  });

  star.addEventListener('mouseout', () => {
    document.querySelectorAll('.star').forEach(s => s.classList.remove('star-hover'));
  });
});

function updateStars() {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('star-active', parseInt(s.dataset.value) <= complexity);
  });
}

// ── IMAGE UPLOAD ──────────────────────────────────────────────────────────────
const imageInput   = document.getElementById('recipe-image-file');
const imagePreview = document.getElementById('image-preview');
const uploadHint   = document.querySelector('.image-upload-hint');
const uploadWrap   = document.getElementById('image-upload-wrap');

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  imageFilename = file.name;
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = 'block';
  uploadHint.style.display = 'none';
  updatePreview();
});

// Drag and drop
uploadWrap.addEventListener('dragover', e => {
  e.preventDefault();
  uploadWrap.classList.add('drag-over');
});
uploadWrap.addEventListener('dragleave', () => uploadWrap.classList.remove('drag-over'));
uploadWrap.addEventListener('drop', e => {
  e.preventDefault();
  uploadWrap.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  imageInput.files = dt.files;
  imageInput.dispatchEvent(new Event('change'));
});

// ── INGREDIENTS ───────────────────────────────────────────────────────────────
let ingredientCount = 0;

function addIngredientRow(name = '', qty = '', unit = '') {
  ingredientCount++;
  const id  = ingredientCount;
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.dataset.id = id;

  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="Ingredient name" value="${name}">
    <input type="number" class="ing-qty" placeholder="Qty" min="0" step="any" value="${qty}" style="max-width:70px;">
    <select class="ing-unit">
      ${MEASUREMENTS.map(m => `<option value="${m}" ${m === unit ? 'selected' : ''}>${m || '—'}</option>`).join('')}
    </select>
    <button type="button" class="remove-row-btn" aria-label="Remove">✕</button>`;

  row.querySelector('.remove-row-btn').addEventListener('click', () => {
    row.remove();
    updatePreview();
  });

  row.querySelectorAll('input, select').forEach(el =>
    el.addEventListener('input', updatePreview)
  );

  document.getElementById('ingredients-list').appendChild(row);
  updatePreview();
}

document.getElementById('add-ingredient').addEventListener('click', () => addIngredientRow());

function getIngredients() {
  return [...document.querySelectorAll('.ingredient-row')].map(row => ({
    name:     row.querySelector('.ing-name').value.trim(),
    quantity: [
      row.querySelector('.ing-qty').value.trim(),
      row.querySelector('.ing-unit').value,
    ].filter(Boolean).join(' '),
  })).filter(ing => ing.name);
}

// ── STEPS ─────────────────────────────────────────────────────────────────────
let stepCount = 0;

function addStepRow(text = '') {
  stepCount++;
  const num  = document.querySelectorAll('.step-row').length + 1;
  const row  = document.createElement('div');
  row.className = 'step-row';

  row.innerHTML = `
    <span class="step-num">${num}</span>
    <textarea class="step-text" rows="2" placeholder="Describe this step...">${text}</textarea>
    <button type="button" class="remove-row-btn" aria-label="Remove">✕</button>`;

  row.querySelector('.remove-row-btn').addEventListener('click', () => {
    row.remove();
    renumberSteps();
    updatePreview();
  });

  row.querySelector('textarea').addEventListener('input', updatePreview);

  document.getElementById('steps-list').appendChild(row);
  updatePreview();
}

document.getElementById('add-step').addEventListener('click', () => addStepRow());

function renumberSteps() {
  document.querySelectorAll('.step-num').forEach((el, i) => {
    el.textContent = i + 1;
  });
}

function getSteps() {
  return [...document.querySelectorAll('.step-text')]
    .map(t => t.value.trim())
    .filter(Boolean);
}

// ── LIVE PREVIEW ──────────────────────────────────────────────────────────────
function updatePreview() {
  const name       = document.getElementById('recipe-name').value.trim();
  const meal       = document.getElementById('recipe-meal').value;
  const cuisine    = document.getElementById('recipe-cuisine').value;
  const time       = document.getElementById('recipe-time').value;
  const servings   = document.getElementById('recipe-servings').value;
  const source     = document.getElementById('recipe-source').value.trim();
  const ingredients = getIngredients();
  const steps      = getSteps();

  const stars = complexity
    ? '★'.repeat(complexity) + '☆'.repeat(5 - complexity)
    : '☆☆☆☆☆';

  const imgHtml = imageFilename
    ? `<img src="${imagePreview.src}" alt="Preview" class="preview-img">`
    : `<div class="preview-img-placeholder">🍽️</div>`;

  const tagsHtml = [meal, cuisine].filter(Boolean)
    .map(t => `<span class="meal-tag">${t}</span>`).join('');

  const ingHtml = ingredients.length
    ? `<h4 class="preview-subtitle">Ingredients</h4>
       <ul class="preview-ing-list">
         ${ingredients.map(i => `<li><span>${i.name}</span><span class="ingredient-qty">${i.quantity}</span></li>`).join('')}
       </ul>`
    : '';

  const stepsHtml = steps.length
    ? `<h4 class="preview-subtitle">Steps</h4>
       <ol class="steps-list preview-steps">
         ${steps.map(s => `<li>${s}</li>`).join('')}
       </ol>`
    : '';

  document.getElementById('recipe-preview').innerHTML = `
    ${imgHtml}
    <div class="preview-body">
      ${tagsHtml}
      <h3 class="preview-name">${name || '<span style="color:var(--text-muted)">Recipe name...</span>'}</h3>
      <div class="preview-meta">
        ${stars ? `<span title="Complexity">${stars}</span>` : ''}
        ${time     ? `<span>⏱ ${time} min</span>`      : ''}
        ${servings ? `<span>👥 Serves ${servings}</span>` : ''}
        ${source   ? `<a href="${source}" target="_blank" style="color:var(--terracotta);">🔗 Source</a>` : ''}
      </div>
      ${ingHtml}
      ${stepsHtml}
    </div>`;
}

// ── BUILD JSON ────────────────────────────────────────────────────────────────
function buildRecipeJSON() {
  const name = document.getElementById('recipe-name').value.trim();
  if (!name) { alert('Please enter a recipe name.'); return null; }

  const meal = document.getElementById('recipe-meal').value;
  if (!meal) { alert('Please select a meal type.'); return null; }

  return {
    id:          Date.now(),
    name,
    meal,
    cuisine:     document.getElementById('recipe-cuisine').value || '',
    cookTime:    parseInt(document.getElementById('recipe-time').value) || null,
    servings:    parseInt(document.getElementById('recipe-servings').value) || null,
    complexity,
    image:       imageFilename || '',
    source:      document.getElementById('recipe-source').value.trim() || '',
    ingredients: getIngredients(),
    instructions: getSteps(),
  };
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
document.getElementById('export-recipe').addEventListener('click', () => {
  const recipe = buildRecipeJSON();
  if (!recipe) return;

  const json     = JSON.stringify(recipe, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const filename = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';

  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

// ── CLEAR ─────────────────────────────────────────────────────────────────────
document.getElementById('clear-form').addEventListener('click', () => {
  if (!confirm('Clear the form? All unsaved changes will be lost.')) return;

  document.getElementById('recipe-name').value     = '';
  document.getElementById('recipe-meal').value     = '';
  document.getElementById('recipe-cuisine').value  = '';
  document.getElementById('recipe-time').value     = '';
  document.getElementById('recipe-servings').value = '';
  document.getElementById('recipe-source').value   = '';
  document.getElementById('recipe-complexity').value = 0;
  complexity   = 0;
  imageFilename = '';

  updateStars();
  imagePreview.style.display = 'none';
  imagePreview.src = '';
  uploadHint.style.display = '';
  imageInput.value = '';

  document.getElementById('ingredients-list').innerHTML = '';
  document.getElementById('steps-list').innerHTML = '';
  updatePreview();
});

// Listen for basic input changes
['recipe-name','recipe-meal','recipe-cuisine','recipe-time','recipe-servings','recipe-source'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});

// ── INIT ──────────────────────────────────────────────────────────────────────
addIngredientRow();
addStepRow();
updatePreview();
