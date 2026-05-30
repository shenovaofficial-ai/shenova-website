let allProducts = [];
let currentCategory = 'all';
let currentSort = 'new';

// SHENOVA Essentials: categories treated as accessories
const ESSENTIALS_CATS = ['essentials', 'jewellery', 'accessories'];

async function loadShop(){
  try{
    const r = await fetch(API+'/products');
    allProducts = await r.json();
    if (!allProducts.length) allProducts = sampleProducts();
  }catch{ allProducts = sampleProducts(); }

  // ── Read category from URL param (e.g. shop.html?cat=essentials)
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
  if (currentCategory !== 'all')
    list = list.filter(p =>
      (p.category||'').toLowerCase() === currentCategory
    );
  if (currentSort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  if (currentSort === 'price-desc') list.sort((a,b)=>b.price-a.price);
  document.querySelector('#shop-grid').innerHTML = list.map(productCard).join('') || '<p>No products.</p>';
  document.querySelectorAll('.card').forEach(c => c.classList.add('in'));

  // Show essentials banner when an essentials category is selected
  const banner = document.getElementById('ess-shop-banner');
  if (banner) {
    banner.classList.toggle('visible', ESSENTIALS_CATS.includes(currentCategory));
  }
}

document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  currentCategory = c.dataset.cat;
  renderShop();
}));

document.querySelector('#sort')?.addEventListener('change', e => { currentSort = e.target.value; renderShop(); });
loadShop();