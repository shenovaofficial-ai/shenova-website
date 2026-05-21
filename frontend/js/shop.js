let allProducts     = [];
let currentCategory = 'all';
let currentSort     = 'new';

async function loadShop() {
  try {
    const r = await fetch(API + '/products');
    allProducts = await r.json();
    if (!allProducts.length) allProducts = sampleProducts();
  } catch {
    allProducts = sampleProducts();
  }
  renderShop();
}

function renderShop() {
  let list = [...allProducts];

  if (currentCategory !== 'all') {
    list = list.filter(p =>
      (p.category || '').toLowerCase() === currentCategory
    );
  }

  if (currentSort === 'price-asc')  list.sort((a, b) => a.price - b.price);
  if (currentSort === 'price-desc') list.sort((a, b) => b.price - a.price);

  const grid = document.querySelector('#shop-grid');
  grid.innerHTML = list.map(productCard).join('') || '<p>No products.</p>';

  document.querySelectorAll('.card').forEach(c => c.classList.add('in'));

  // Wire IntersectionObserver autoplay for any video cards in this render
  if (typeof window.initCardVideos === 'function') {
    window.initCardVideos(grid);
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