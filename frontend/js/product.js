/* ============================================================
   product.js — Shenova PDP Logic
   Backend integrations fully preserved.
   Updated selectors to match redesigned product.html.
   ============================================================ */

const id = new URLSearchParams(location.search).get('id');
let product = null;
let currentImg = 0;
let selectedSize = null;
let selectedColor = null;

/* ──── Load product from API or fallback to sample ──── */
async function loadProduct() {
  try {
    const r = await fetch(API + '/products/' + id);
    if (!r.ok) throw 0;
    product = await r.json();
  } catch {
    product = sampleProducts().find(p => p.id === id) || sampleProducts()[0];
  }
  render();
}

/* ──── Image URL helper ──── */
function imgUrl(s) {
  return s?.startsWith('http') ? s : API_BASE + s;
}

/* ──── Full render ──── */
function render() {
  if (!product) return;

  /* Page title */
  document.title = product.name + ' · Shenova';

  /* Breadcrumb */
  const bc = document.getElementById('pdp-bc-name');
  if (bc) bc.textContent = product.name;

  /* Category eyebrow */
  const catEl = document.getElementById('pdp-category');
  if (catEl && product.category) catEl.textContent = product.category;

  /* Name, price, description */
  document.querySelector('#pdp-name').textContent = product.name;
  document.querySelector('#pdp-price').textContent = '₹' + product.price.toLocaleString();
  document.querySelector('#pdp-desc').textContent =
    product.description || 'Crafted with the finest fabrics for an effortless silhouette.';

  /* Images */
  const imgs = product.images || [];
  const mainImg = document.querySelector('#pdp-main-img');
  if (mainImg) mainImg.src = imgUrl(imgs[0] || '');

  /* Counter */
  updateCounter();

  /* Thumbnail strip */
  const thumbsWrap = document.querySelector('#pdp-thumbs');
  if (thumbsWrap) {
    thumbsWrap.innerHTML = imgs.map((im, i) =>
      `<img src="${imgUrl(im)}" class="${i === 0 ? 'active' : ''}"
            onclick="setImg(${i})" alt="View ${i + 1}">`
    ).join('');
  }

  /* Mobile dots */
  const dotsWrap = document.getElementById('pdp-dots');
  if (dotsWrap) {
    dotsWrap.innerHTML = imgs.map((_, i) =>
      `<span class="pdp-dot ${i === 0 ? 'active' : ''}" onclick="setImg(${i})"></span>`
    ).join('');
  }

  /* Size buttons */
  document.querySelector('#pdp-sizes').innerHTML =
    (product.sizes || ['XS', 'S', 'M', 'L']).map(s =>
      `<button class="size" onclick="setSize('${s}',this)"><span>${s}</span></button>`
    ).join('');

  /* Colour swatches */
  const colors = product.colors || [];
  const colorWrap = document.querySelector('#pdp-colors-wrap');
  if (colorWrap) colorWrap.style.display = colors.length ? 'block' : 'none';
  document.querySelector('#pdp-colors').innerHTML = colors.map(c =>
    `<button class="color" style="background:${c}" onclick="setColor('${c}',this)" title="${c}"></button>`
  ).join('');

  /* Wishlist state */
  const wishIds = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const pid = product._id || product.id;
  if (wishIds.includes(pid)) {
    document.querySelector('#pdp-wish')?.classList.add('active');
  }

  /* Related products */
  loadRelated();

  /* Smooth stagger for info section */
  animateInfoIn();
}

/* ──── Image counter display ──── */
function updateCounter() {
  const total = (product.images || []).length;
  const cur  = document.getElementById('pdp-img-cur');
  const tot  = document.getElementById('pdp-img-total');
  if (cur) cur.textContent  = currentImg + 1;
  if (tot) tot.textContent  = total;
}

/* ──── Image switching with fade ──── */
window.setImg = function(i) {
  currentImg = i;
  const imgs = product.images || [];

  const mainImg = document.querySelector('#pdp-main-img');
  if (mainImg) {
    mainImg.style.opacity   = '0';
    mainImg.style.transform = 'scale(1.025)';
    setTimeout(() => {
      mainImg.src             = imgUrl(imgs[i]);
      mainImg.style.opacity   = '1';
      mainImg.style.transform = 'scale(1)';
    }, 180);
  }

  /* Thumbnail active */
  document.querySelectorAll('#pdp-thumbs img').forEach((t, k) =>
    t.classList.toggle('active', k === i)
  );

  /* Dot active */
  document.querySelectorAll('.pdp-dot').forEach((d, k) =>
    d.classList.toggle('active', k === i)
  );

  updateCounter();
};

/* Attach transition once img is ready */
const _mainImg = document.querySelector('#pdp-main-img');
if (_mainImg) {
  Object.assign(_mainImg.style, {
    transition: 'opacity 0.22s ease, transform 0.22s ease'
  });
}

window.nextImg = () => setImg((currentImg + 1) % (product?.images?.length || 1));
window.prevImg = () => setImg((currentImg - 1 + (product?.images?.length || 1)) % (product?.images?.length || 1));

/* ──── Swipe support (mobile) ──── */
let _touchStartX = 0;
document.querySelector('#pdp-main-frame')?.addEventListener('touchstart', e => {
  _touchStartX = e.touches[0].clientX;
}, { passive: true });
document.querySelector('#pdp-main-frame')?.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _touchStartX;
  if (Math.abs(dx) > 44) dx < 0 ? window.nextImg() : window.prevImg();
});

/* ──── Size selection ──── */
window.setSize = function(s, el) {
  selectedSize = s;
  document.querySelectorAll('#pdp-sizes .size').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
};

/* ──── Colour selection ──── */
window.setColor = function(c, el) {
  selectedColor = c;
  document.querySelectorAll('#pdp-colors .color').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  const nameEl = document.getElementById('pdp-color-name');
  if (nameEl) nameEl.textContent = c;
};

/* ──── Add to cart (backend logic intact) ──── */
window.addToCart = function() {
  if (!selectedSize) {
    showModal('Select your size', 'Please choose a size before adding to your bag.');
    /* Shake the size row */
    const sizesEl = document.querySelector('#pdp-sizes');
    if (sizesEl) {
      sizesEl.style.animation = 'none';
      sizesEl.offsetHeight; // reflow
      sizesEl.style.animation = 'pdpShake 0.4s ease';
    }
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  cart.push({
    id:    product._id || product.id,
    name:  product.name,
    price: product.price,
    image: imgUrl(product.images[0]),
    size:  selectedSize,
    color: selectedColor,
    qty:   1
  });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  openCart();

  /* Button success feedback */
  const btn = document.querySelector('.pdp-add-btn');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span>Added ✓</span>';
    btn.style.background = '#2d7a50';
    setTimeout(() => {
      btn.innerHTML        = orig;
      btn.style.background = '';
    }, 1800);
  }
};

/* ──── Wishlist toggle ──── */
window.toggleWish = function() {
  const w   = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const pid = product._id || product.id;
  const i   = w.indexOf(pid);
  if (i > -1) w.splice(i, 1); else w.push(pid);
  localStorage.setItem('wishlist', JSON.stringify(w));
  document.querySelector('#pdp-wish')?.classList.toggle('active');
};

/* ──── Zoom overlay (delegated; inline listener in HTML also works) ──── */
document.querySelector('#pdp-main-img')?.addEventListener('click', function() {
  const overlay = document.getElementById('pdp-zoom-overlay');
  const zoomImg = document.getElementById('pdp-zoom-img');
  if (overlay && zoomImg) {
    zoomImg.src = this.src;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
});

window.closeZoom = function() {
  document.getElementById('pdp-zoom-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
};

/* ──── Related products (backend intact) ──── */
async function loadRelated() {
  const wrap = document.querySelector('#related');
  if (!wrap) return;
  try {
    const r    = await fetch(API + '/products');
    let list   = await r.json();
    if (!list.length) list = sampleProducts();
    list = list.filter(p => (p._id || p.id) !== (product._id || product.id)).slice(0, 4);
    wrap.innerHTML = list.map(productCard).join('');
  } catch {
    wrap.innerHTML = sampleProducts().slice(0, 4).map(productCard).join('');
  }
}

/* ──── Staggered entry animation for info panel ──── */
function animateInfoIn() {
  const targets = [
    '.pdp-eyebrow',
    '.pdp-title',
    '.pdp-price-row',
    '.pdp-rating',
    '.pdp-rule',
    '.pdp-desc',
    '.pdp-opt',
    '.pdp-cta',
    '.pdp-trust',
    '.pdp-acc'
  ];
  targets.forEach((sel, i) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.065}s, transform 0.6s ease ${i * 0.065}s`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }));
  });
}

/* ──── Keyboard navigation ──── */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') window.nextImg?.();
  if (e.key === 'ArrowLeft')  window.prevImg?.();
  if (e.key === 'Escape')   { window.closeZoom?.(); }
});

/* ──── Init ──── */
loadProduct();
window.openSizeGuide = function(){

  document
  .getElementById('sizeGuide')
  .classList.add('active');

}

window.closeSizeGuide = function(){

  document
  .getElementById('sizeGuide')
  .classList.remove('active');

}