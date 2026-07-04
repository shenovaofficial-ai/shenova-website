/* ================================================================
   SHENOVA — shop.js  (Premium Shop Page)
   All existing selectors/behaviour preserved. New features are
   purely additive and degrade gracefully when product data doesn't
   include optional fields (rating, stock, originalPrice, isNew).
   ================================================================ */

let allProducts   = [];
let currentCategory = 'all';
let currentSort     = 'featured';
let searchQuery      = '';
let maxPriceCeiling  = 50000;   // recalculated from real data on load
let priceFilter       = Infinity;
let inStockOnly        = false;
let minRating           = 0;
let currentPage          = 1;
const PAGE_SIZE          = 12;

// Keywords jo essentials/accessories identify karti hain
const ESSENTIALS_KEYWORDS = [
  'essentials','jewellery','jewelry','accessories','accessory',
  'earring','necklace','ring','bracelet','anklet','pendant',
  'hair','scrunchie','clip','pin'
];

function isEssential(p) {
  const cat = (p.category || '').toLowerCase().trim();
  return ESSENTIALS_KEYWORDS.some(kw => cat.includes(kw));
}

/* ── Wishlist (localStorage, additive — key: shenova_wishlist) ──
   Stores an array of product IDs. If Krish already has a wishlist
   page reading a different key/shape, point it at the same key or
   tell me the shape and I'll match it exactly. ── */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem('shenova_wishlist') || '[]'); }
  catch { return []; }
}
function isWishlisted(id) {
  return getWishlist().includes(id);
}
function toggleWishlist(id) {
  let list = getWishlist();
  if (list.includes(id)) list = list.filter(x => x !== id);
  else list.push(id);
  localStorage.setItem('shenova_wishlist', JSON.stringify(list));
  return list.includes(id);
}

/* ── Optional-field helpers (all gracefully degrade) ── */
function getOriginalPrice(p) {
  const v = p.originalPrice || p.mrp || p.compareAtPrice;
  return (typeof v === 'number' && v > p.price) ? v : null;
}
function getStock(p) {
  if (typeof p.stock === 'number') return p.stock;
  if (typeof p.inStock === 'boolean') return p.inStock ? 1 : 0;
  return null; // unknown → treat as always available
}
function isOutOfStock(p) {
  const s = getStock(p);
  return s !== null && s <= 0;
}
function isNewProduct(p) {
  if (typeof p.isNew === 'boolean') return p.isNew;
  if (p.createdAt) {
    const days = (Date.now() - new Date(p.createdAt).getTime()) / 86400000;
    return days <= 21;
  }
  return false;
}
function getRating(p) {
  return typeof p.rating === 'number' ? p.rating : null;
}

/* ── Shared badge + wishlist markup for any card ── */
function badgesHTML(p) {
  const badges = [];
  if (isNewProduct(p)) badges.push('<span class="badge badge-new">New</span>');
  const orig = getOriginalPrice(p);
  if (orig) {
    const pct = Math.round((1 - p.price / orig) * 100);
    if (pct > 0) badges.push(`<span class="badge badge-sale">−${pct}%</span>`);
  }
  if (isOutOfStock(p)) badges.push('<span class="badge badge-out">Sold Out</span>');
  return badges.length ? `<div class="card-badges">${badges.join('')}</div>` : '';
}

function wishlistBtnHTML(p) {
  const id = p._id || p.id || '';
  const active = isWishlisted(id) ? ' active' : '';
  return `
    <button class="wishlist-btn${active}" data-wish-id="${id}"
            aria-label="Toggle wishlist" onclick="handleWishlistClick(event, this)">
      <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2.3 4.5 6 4c2.1-.3 4 .8 6 3.1C14 4.8 15.9 3.7 18 4c3.7.5 5.6 4.2 4 7.7C19.5 16.4 12 21 12 21z"/></svg>
    </button>`;
}

function priceHTML(p) {
  const orig = getOriginalPrice(p);
  return orig
    ? `<span class="price-original">₹${orig.toLocaleString()}</span><span class="price-now">₹${p.price.toLocaleString()}</span>`
    : `₹${p.price.toLocaleString()}`;
}

function ratingHTML(p) {
  const r = getRating(p);
  if (r === null) return '';
  const full = Math.round(r);
  return `<div class="card-rating">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</div>`;
}

window.handleWishlistClick = function (e, btn) {
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.wishId;
  const active = toggleWishlist(id);
  btn.classList.toggle('active', active);
};

/* ── Essentials card — no hover swap, single image ── */
function essCard(p) {
  const img = p.images?.[0]?.startsWith('http')
    ? p.images[0]
    : API_BASE + (p.images?.[0] || '');
  const outClass = isOutOfStock(p) ? ' is-out' : '';

  return `
  <div class="product-card ess-card${outClass}">
    ${badgesHTML(p)}
    ${wishlistBtnHTML(p)}
    <a href="product-essentials.html?id=${p._id}">
      <div class="product-image" style="overflow:hidden;">
        <img class="main-img" src="${img}" alt="${p.name}"
             style="transition:transform 0.6s cubic-bezier(.19,1,.22,1);">
        <button class="quick-btn"
                onclick='openQuickView(event, ${JSON.stringify(p)})'>
          QUICK VIEW
        </button>
      </div>
    </a>
    <div class="product-info">
      <div class="product-title">${p.name}</div>
      ${ratingHTML(p)}
      <div class="product-price">${priceHTML(p)}</div>
    </div>
  </div>`;
}

/* ── Standard clothing card — hover swap, badges, wishlist ── */
function premiumCard(p) {
  const img1 = p.images?.[0]?.startsWith('http') ? p.images[0] : API_BASE + (p.images?.[0] || '');
  const img2 = p.images?.[1]
    ? (p.images[1].startsWith('http') ? p.images[1] : API_BASE + p.images[1])
    : null;
  const outClass = isOutOfStock(p) ? ' is-out' : '';

  return `
  <div class="product-card${outClass}">
    ${badgesHTML(p)}
    ${wishlistBtnHTML(p)}
    <a href="product.html?id=${p._id}">
      <div class="product-image">
        <img class="main-img" src="${img1}" alt="${p.name}">
        ${img2 ? `<img class="hover-img" src="${img2}" alt="${p.name}">` : ''}
        <button class="quick-btn"
                onclick='openQuickView(event, ${JSON.stringify(p)})'>
          QUICK VIEW
        </button>
      </div>
    </a>
    <div class="product-info">
      <div class="product-title">${p.name}</div>
      ${ratingHTML(p)}
      <div class="product-price">${priceHTML(p)}</div>
    </div>
  </div>`;
}

/* ── Pick correct card renderer per product ── */
function renderCard(p) {
  return isEssential(p) ? essCard(p) : premiumCard(p);
}

/* ── Skeleton while first fetch is in flight ── */
function renderSkeleton() {
  const grid = document.querySelector('#shop-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="skeleton-grid">${Array(9).fill(`
    <div class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-price"></div>
    </div>`).join('')}</div>`;
}

async function loadShop() {
  renderSkeleton();

  let loadFailed = false;
  try {
    const r = await fetch(API + '/products');
    if (!r.ok) throw new Error('bad response');
    allProducts = await r.json();
    if (!allProducts.length) allProducts = sampleProducts();
  } catch {
    loadFailed = true;
    try { allProducts = sampleProducts(); } catch { allProducts = []; }
  }

  // Read category from URL param (e.g. shop.html?cat=essentials)
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat) {
    currentCategory = urlCat.toLowerCase();
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.cat === currentCategory);
    });
  }

  setupPriceRange();
  setupOptionalSections();

  if (loadFailed && !allProducts.length) {
    renderError();
    return;
  }

  renderShop();
}

/* ── Configure the price slider ceiling from real data ── */
function setupPriceRange() {
  const input = document.getElementById('priceRange');
  if (!input || !allProducts.length) return;
  const prices = allProducts.map(p => p.price).filter(n => typeof n === 'number');
  if (!prices.length) return;
  const max = Math.ceil(Math.max(...prices) / 500) * 500;
  maxPriceCeiling = max || 50000;
  input.min = 0;
  input.max = maxPriceCeiling;
  input.value = maxPriceCeiling;
  priceFilter = maxPriceCeiling;
  updatePriceUI();
}

function updatePriceUI() {
  const input = document.getElementById('priceRange');
  const fill  = document.getElementById('priceFill');
  const label = document.getElementById('priceMaxLabel');
  if (!input) return;
  const pct = (priceFilter / maxPriceCeiling) * 100;
  if (fill) fill.style.width = pct + '%';
  if (label) {
    label.textContent = priceFilter >= maxPriceCeiling
      ? `₹${maxPriceCeiling.toLocaleString()}+`
      : `₹${priceFilter.toLocaleString()}`;
  }
}

/* ── Show Availability / Rating sections only if data supports them ── */
function setupOptionalSections() {
  const hasStock  = allProducts.some(p => typeof p.stock === 'number' || typeof p.inStock === 'boolean');
  const hasRating = allProducts.some(p => typeof p.rating === 'number');
  const availSection  = document.getElementById('availabilitySection');
  const ratingSection = document.getElementById('ratingSection');
  if (availSection)  availSection.style.display  = hasStock  ? '' : 'none';
  if (ratingSection) ratingSection.style.display = hasRating ? '' : 'none';
}

function activeFilterCount() {
  let n = 0;
  if (priceFilter < maxPriceCeiling) n++;
  if (inStockOnly) n++;
  if (minRating > 0) n++;
  if (searchQuery.trim()) n++;
  return n;
}

function updateFilterCountBadge() {
  const el = document.getElementById('filterCount');
  if (!el) return;
  const n = activeFilterCount();
  el.textContent = n;
  el.style.display = n > 0 ? '' : 'none';
}

function applySort(list) {
  const sorted = [...list];
  switch (currentSort) {
    case 'price-asc':  sorted.sort((a, b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'rating':     sorted.sort((a, b) => (getRating(b) || 0) - (getRating(a) || 0)); break;
    case 'new':
      sorted.sort((a, b) => {
        if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
        return 0; // no reliable date field → keep API order
      });
      if (!sorted.some(p => p.createdAt)) sorted.reverse();
      break;
    default: /* featured → original API order */ break;
  }
  return sorted;
}

function renderShop() {
  let list = [...allProducts];

  if (currentCategory === 'all') {
    list = list.filter(p => !isEssential(p));
  } else if (ESSENTIALS_KEYWORDS.some(kw => currentCategory.includes(kw))) {
    list = list.filter(p => {
      const cat = (p.category || '').toLowerCase().trim();
      return cat === currentCategory || cat.includes(currentCategory);
    });
  } else {
    list = list.filter(p =>
      (p.category || '').toLowerCase().trim() === currentCategory && !isEssential(p)
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  list = list.filter(p => p.price <= priceFilter);

  if (inStockOnly) list = list.filter(p => !isOutOfStock(p));
  if (minRating > 0) list = list.filter(p => (getRating(p) || 0) >= minRating);

  list = applySort(list);

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const pageList = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const grid  = document.querySelector('#shop-grid');
  const empty = document.getElementById('shop-empty');

  if (!totalItems) {
    grid.innerHTML = '';
    renderEmpty();
  } else {
    if (empty) empty.style.display = 'none';
    grid.innerHTML = pageList.map(renderCard).join('');
    document.querySelectorAll('.card').forEach(c => c.classList.add('in'));
  }

  renderPagination(totalPages);
  updateFilterCountBadge();
  updateShopCount(totalItems);

  // Essentials banner sirf essentials/jewellery/accessories filter pe
  const banner = document.getElementById('ess-shop-banner');
  if (banner) {
    const isEssCat = ESSENTIALS_KEYWORDS.some(kw => currentCategory.includes(kw))
      && currentCategory !== 'all';
    banner.classList.toggle('visible', isEssCat);
  }
}

function updateShopCount(n) {
  const el = document.getElementById('shop-count');
  if (!el) return;
  el.textContent = n > 0 ? n + (n === 1 ? ' Piece' : ' Pieces') : '';
  el.style.opacity = n > 0 ? '1' : '0';
}

function renderEmpty() {
  updateShopCount(0);
  const empty = document.getElementById('shop-empty');
  const pagination = document.getElementById('shop-pagination');
  if (pagination) pagination.innerHTML = '';
  if (!empty) return;
  empty.style.display = '';
  const hasFilters = activeFilterCount() > 0 || currentCategory !== 'all';
  empty.innerHTML = `
    <svg class="shop-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <p>No pieces found${searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}.</p>
    <p class="shop-empty-sub">Try adjusting your filters or search.</p>
    ${hasFilters ? '<button class="shop-empty-reset" onclick="resetAllFilters()">Clear filters</button>' : ''}
  `;
}

function renderError() {
  const grid = document.querySelector('#shop-grid');
  const empty = document.getElementById('shop-empty');
  if (grid) grid.innerHTML = '';
  if (!empty) return;
  empty.style.display = '';
  empty.innerHTML = `
    <svg class="shop-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>
    </svg>
    <p>The collection couldn't load.</p>
    <p class="shop-empty-sub">Please check your connection and try again.</p>
    <button class="shop-empty-reset" onclick="location.reload()">Retry</button>
  `;
}

/* ── Pagination ── */
function renderPagination(totalPages) {
  const wrap = document.getElementById('shop-pagination');
  if (!wrap) return;
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const pages = [];
  const add = (n) => pages.push(n);
  add(1);
  if (currentPage > 3) pages.push('...');
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) add(i);
  if (currentPage < totalPages - 2) pages.push('...');
  if (totalPages > 1) add(totalPages);

  const uniq = [...new Set(pages)];

  wrap.innerHTML = `
    <button class="page-arrow" id="pagePrev" aria-label="Previous page" ${currentPage === 1 ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    ${uniq.map(p => p === '...'
      ? '<span class="page-dots">···</span>'
      : `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`
    ).join('')}
    <button class="page-arrow" id="pageNext" aria-label="Next page" ${currentPage === totalPages ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  `;

  wrap.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => goToPage(Number(btn.dataset.page)));
  });
  document.getElementById('pagePrev')?.addEventListener('click', () => goToPage(currentPage - 1));
  document.getElementById('pageNext')?.addEventListener('click', () => goToPage(currentPage + 1));
}

function goToPage(n) {
  currentPage = n;
  renderShop();
  document.getElementById('shop-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Reset all filters (called from empty state + sidebar button) ── */
window.resetAllFilters = function () {
  currentCategory = 'all';
  searchQuery = '';
  priceFilter = maxPriceCeiling;
  inStockOnly = false;
  minRating = 0;
  currentPage = 1;

  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
  const search = document.getElementById('shop-search');
  if (search) search.value = '';
  const price = document.getElementById('priceRange');
  if (price) price.value = maxPriceCeiling;
  updatePriceUI();
  const stock = document.getElementById('inStockOnly');
  if (stock) stock.checked = false;
  document.querySelectorAll('.rating-filter button').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.min) === 0));

  renderShop();
};

/* ================================================================
   EVENT BINDINGS
   ================================================================ */

document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  document.querySelectorAll(`.chip[data-cat="${c.dataset.cat}"]`).forEach(x => x.classList.add('active'));
  currentCategory = c.dataset.cat;
  currentPage = 1;
  renderShop();
}));

document.querySelector('#sort')?.addEventListener('change', e => {
  currentSort = e.target.value;
  renderShop();
});

/* Search — debounced */
let searchDebounce;
document.getElementById('shop-search')?.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  const val = e.target.value;
  searchDebounce = setTimeout(() => {
    searchQuery = val;
    currentPage = 1;
    renderShop();
  }, 200);
});

/* Price range */
document.getElementById('priceRange')?.addEventListener('input', e => {
  priceFilter = Number(e.target.value);
  updatePriceUI();
});
document.getElementById('priceRange')?.addEventListener('change', () => {
  currentPage = 1;
  renderShop();
});

/* Availability */
document.getElementById('inStockOnly')?.addEventListener('change', e => {
  inStockOnly = e.target.checked;
  currentPage = 1;
  renderShop();
});

/* Rating */
document.querySelectorAll('.rating-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rating-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    minRating = Number(btn.dataset.min);
    currentPage = 1;
    renderShop();
  });
});

/* Sidebar accordion */
document.querySelectorAll('.sidebar-section-head').forEach(head => {
  head.addEventListener('click', () => {
    head.closest('.sidebar-section')?.classList.toggle('collapsed');
  });
});

/* Sidebar reset button */
document.getElementById('sidebarReset')?.addEventListener('click', () => window.resetAllFilters());

/* Mobile filter drawer */
const sidebar   = document.getElementById('shop-sidebar');
const scrim     = document.getElementById('sidebarScrim');
function openSidebar() {
  sidebar?.classList.add('open');
  scrim?.classList.add('open');
  document.getElementById('filterToggle')?.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  sidebar?.classList.remove('open');
  scrim?.classList.remove('open');
  document.getElementById('filterToggle')?.setAttribute('aria-expanded', 'false');
}
document.getElementById('filterToggle')?.addEventListener('click', openSidebar);
document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
scrim?.addEventListener('click', closeSidebar);

loadShop();