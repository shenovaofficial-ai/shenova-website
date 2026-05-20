let allProducts = [];
let currentCategory = 'all';
let currentSort = 'new';

async function loadShop(){
  try{
    const r = await fetch(API+'/products');
    allProducts = await r.json();
    if (!allProducts.length) allProducts = sampleProducts();
  }catch{ allProducts = sampleProducts(); }
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
}

document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  currentCategory = c.dataset.cat;
  renderShop();
}));

document.querySelector('#sort')?.addEventListener('change', e => { currentSort = e.target.value; renderShop(); });
loadShop();
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open');
});