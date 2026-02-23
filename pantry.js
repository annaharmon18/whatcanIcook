// ── STORAGE ───────────────────────────────────────────────────────────────────
// Items stored as: [{ name, quantity, addedOn, expiresOn }, ...]
const STORAGE_KEY = 'whatcanicook_pantry';

function loadPantry() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return raw.map(item =>
      typeof item === 'string' ? { name: item, quantity: '', addedOn: null, expiresOn: null } : item
    );
  } catch { return []; }
}

function savePantry(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── SHELF LIFE LOOKUP ─────────────────────────────────────────────────────────
// Returns shelf life in days for a given ingredient name, or null if unknown.
// Matched by checking if any keyword appears in the ingredient name.
const SHELF_LIFE = [
  // Dairy
  { keywords: ['milk'],                   days: 7  },
  { keywords: ['cream', 'half and half'], days: 10 },
  { keywords: ['butter'],                 days: 21 },
  { keywords: ['yogurt', 'yoghurt'],      days: 14 },
  { keywords: ['sour cream'],             days: 14 },
  { keywords: ['cream cheese'],           days: 14 },
  { keywords: ['cottage cheese'],         days: 7  },
  { keywords: ['hard cheese', 'cheddar', 'parmesan', 'gouda', 'swiss'], days: 30 },
  { keywords: ['soft cheese', 'brie', 'camembert', 'feta'],             days: 7  },
  { keywords: ['mozzarella'],             days: 5  },
  // Eggs
  { keywords: ['egg'],                    days: 35 },
  // Meat & Fish
  { keywords: ['chicken', 'turkey', 'ground'],    days: 2  },
  { keywords: ['beef', 'pork', 'lamb', 'steak'],  days: 3  },
  { keywords: ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn'], days: 2 },
  { keywords: ['bacon', 'sausage', 'deli', 'ham', 'salami'],         days: 7 },
  { keywords: ['cooked meat', 'leftover'],        days: 4  },
  // Produce — quick spoiling
  { keywords: ['lettuce', 'spinach', 'arugula', 'greens', 'kale'], days: 7  },
  { keywords: ['strawberr', 'raspberr', 'blueberr', 'blackberr'],  days: 5  },
  { keywords: ['mushroom'],               days: 7  },
  { keywords: ['avocado'],                days: 4  },
  { keywords: ['tomato'],                 days: 7  },
  { keywords: ['broccoli', 'cauliflower', 'asparagus'],             days: 5  },
  { keywords: ['corn'],                   days: 3  },
  { keywords: ['cucumber'],               days: 7  },
  { keywords: ['fresh herb', 'cilantro', 'parsley', 'basil', 'mint', 'dill'], days: 7 },
  // Produce — longer lasting
  { keywords: ['apple', 'pear'],          days: 30 },
  { keywords: ['orange', 'lemon', 'lime', 'grapefruit'],            days: 21 },
  { keywords: ['grape'],                  days: 14 },
  { keywords: ['carrot', 'celery'],       days: 21 },
  { keywords: ['onion', 'shallot'],       days: 60 },
  { keywords: ['garlic'],                 days: 90 },
  { keywords: ['potato', 'sweet potato'], days: 30 },
  { keywords: ['cabbage'],                days: 14 },
  { keywords: ['pepper', 'bell pepper'],  days: 14 },
  { keywords: ['zucchini', 'squash'],     days: 7  },
  { keywords: ['eggplant', 'aubergine'],  days: 7  },
  // Bread & Baked
  { keywords: ['bread', 'bun', 'roll', 'bagel'],  days: 7  },
  { keywords: ['tortilla', 'wrap'],                days: 7  },
  // Pantry staples — very long shelf life, no need to flag
  // (excluded intentionally: flour, sugar, rice, pasta, canned goods, oil, spices)
];

function getShelfLife(name) {
  const lower = name.toLowerCase();
  for (const entry of SHELF_LIFE) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.days;
  }
  return null; // unknown — no expiry set
}

function calcExpiresOn(name) {
  const days = getShelfLife(name);
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── EXPIRY HELPERS ────────────────────────────────────────────────────────────
function expiryStatus(expiresOn) {
  if (!expiresOn) return null; // no expiry tracked
  const today  = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(expiresOn);
  const days   = Math.round((expiry - today) / 86400000);
  if (days < 0)  return { label: `Expired ${Math.abs(days)}d ago`, state: 'expired' };
  if (days === 0) return { label: 'Expires today',                  state: 'today'   };
  if (days <= 3)  return { label: `Expires in ${days}d`,            state: 'soon'    };
  return            { label: `Expires ${expiry.toLocaleDateString('en-US', { month:'short', day:'numeric' })}`, state: 'ok' };
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderPantry() {
  const items = loadPantry();
  const list  = document.getElementById('pantry-list');
  const empty = document.getElementById('pantry-empty');
  const count = document.getElementById('item-count');

  const expired = items.filter(i => expiryStatus(i.expiresOn)?.state === 'expired').length;
  count.textContent = items.length
    ? `(${items.length}${expired ? ` · ⚠️ ${expired} expired` : ''})`
    : '';

  if (!items.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  // Sort: expired first, then expiring soon, then alphabetical
  const sorted = [...items].map((item, i) => ({ item, i })).sort((a, b) => {
    const sa = expiryStatus(a.item.expiresOn);
    const sb = expiryStatus(b.item.expiresOn);
    const order = { expired: 0, today: 1, soon: 2, ok: 3, null: 4 };
    const oa = order[sa?.state ?? 'null'];
    const ob = order[sb?.state ?? 'null'];
    if (oa !== ob) return oa - ob;
    return a.item.name.localeCompare(b.item.name);
  });

  empty.style.display = 'none';
  list.innerHTML = sorted.map(({ item, i }) => {
    const status = expiryStatus(item.expiresOn);
    const expBadge = status
      ? `<span class="expiry-badge expiry-${status.state}">${status.label}</span>`
      : '';

    return `
      <li class="pantry-item ${status?.state === 'expired' ? 'pantry-item-expired' : status?.state === 'today' || status?.state === 'soon' ? 'pantry-item-soon' : ''}">
        <div class="pantry-item-info">
          <span class="pantry-item-name">${escapeHtml(item.name)}</span>
          ${item.quantity ? `<span class="pantry-item-qty">${escapeHtml(item.quantity)}</span>` : ''}
          ${expBadge}
        </div>
        <div class="pantry-item-actions">
          <button class="edit-btn" onclick="editItem(${i})" aria-label="Edit">✏️</button>
          <button onclick="removeItem(${i})" aria-label="Remove">✕</button>
        </div>
      </li>`;
  }).join('');
}

// ── ADD ITEM ──────────────────────────────────────────────────────────────────
document.getElementById('add-form').addEventListener('submit', e => {
  e.preventDefault();
  const nameInput = document.getElementById('ingredient-input');
  const qtyInput  = document.getElementById('quantity-input');
  const unitInput = document.getElementById('unit-input');

  const name     = nameInput.value.trim();
  const quantity = [qtyInput.value.trim(), unitInput.value].filter(Boolean).join(' ');

  if (!name) return;

  const items = loadPantry();

  if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
    nameInput.style.borderColor = 'var(--terracotta)';
    nameInput.placeholder = 'Already in pantry!';
    setTimeout(() => {
      nameInput.style.borderColor = '';
      nameInput.placeholder = 'Ingredient (e.g. Rolled Oats)';
    }, 1800);
    nameInput.value = ''; qtyInput.value = ''; unitInput.value = '';
    return;
  }

  const addedOn   = new Date().toISOString().split('T')[0];
  const expiresOn = calcExpiresOn(name);

  items.push({ name, quantity, addedOn, expiresOn });
  savePantry(items);
  renderPantry();
  nameInput.value = ''; qtyInput.value = ''; unitInput.value = '';
  nameInput.focus();
});

// ── EDIT ITEM ─────────────────────────────────────────────────────────────────
function editItem(index) {
  const items = loadPantry();
  const item  = items[index];

  const nameInput = document.getElementById('ingredient-input');
  const qtyInput  = document.getElementById('quantity-input');
  const unitInput = document.getElementById('unit-input');

  const parts = (item.quantity || '').split(' ');
  const num   = parts[0] && !isNaN(parts[0]) ? parts[0] : '';
  const unit  = parts.slice(num ? 1 : 0).join(' ');

  nameInput.value = item.name;
  qtyInput.value  = num;
  unitInput.value = unit;
  nameInput.focus();

  items.splice(index, 1);
  savePantry(items);
  renderPantry();
}

// ── REMOVE ITEM ───────────────────────────────────────────────────────────────
function removeItem(index) {
  const items = loadPantry();
  items.splice(index, 1);
  savePantry(items);
  renderPantry();
}

// ── UTILITY ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
renderPantry();
