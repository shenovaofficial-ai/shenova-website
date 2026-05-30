let allProducts = [];
let currentCategory = 'all';
let currentSort = 'new';

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

/* ── Essentials card — no hover swap, single image ── */
function essCard(p) {
  const img = p.images?.[0]?.startsWith('http')
    ? p.images[0]
    : API_BASE + (p.images?.[0] || '');

  return `
  <div class="product-card ess-card">
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
      <div class="product-price">₹${p.price}</div>
    </div>
  </div>`;
}

/* ── Pick correct card renderer per product ── */
function renderCard(p) {
  return isEssential(p) ? essCard(p) : productCard(p);
}

async function loadShop(){
  try{
    const r = await fetch(API+'/products');
    allProducts = await r.json();
    if (!allProducts.length) allProducts = sampleProducts();
  }catch{ allProducts = sampleProducts(); }

  // Read category from URL param (e.g. shop.html?cat=essentials)
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat) {
    currentCategory = urlCat.toLowerCase();
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.cat === currentCategory);
    });
  }

  renderShop();
}

function renderShop(){
  let list = [...allProducts];

  if (currentCategory === 'all') {
    // ALL tab — sirf clothes, essentials/accessories nahi
    list = list.filter(p => !isEssential(p));

  } else if (ESSENTIALS_KEYWORDS.some(kw => currentCategory.includes(kw))) {
    // Essentials/Jewellery/Accessories filter — sirf wahi category
    list = list.filter(p => {
      const cat = (p.category || '').toLowerCase().trim();
      return cat === currentCategory || cat.includes(currentCategory);
    });

  } else {
    // Clothing filter (dress, tops, kurti etc) — exact match, essentials exclude
    list = list.filter(p =>
      (p.category || '').toLowerCase().trim() === currentCategory
      && !isEssential(p)
    );
  }

  if (currentSort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (currentSort === 'price-desc') list.sort((a,b) => b.price - a.price);

  document.querySelector('#shop-grid').innerHTML =
    list.map(renderCard).join('') || '<p style="padding:40px;color:#888;letter-spacing:.1em">No products found.</p>';
  document.querySelectorAll('.card').forEach(c => c.classList.add('in'));

  // Essentials banner sirf essentials/jewellery/accessories filter pe
  const banner = document.getElementById('ess-shop-banner');
  if (banner) {
    const isEssCat = ESSENTIALS_KEYWORDS.some(kw => currentCategory.includes(kw))
      && currentCategory !== 'all';
    banner.classList.toggle('visible', isEssCat);
  }
}

document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  currentCategory = c.dataset.cat;
  renderShop();
}));

document.querySelector('#sort')?.addEventListener('change', e => {
  currentSort = e.target.value;
  renderShop();
});

loadShop();