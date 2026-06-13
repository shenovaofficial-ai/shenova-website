/* ============================================================
   product.js — Shenova PDP Logic
   STOCK MANAGEMENT ADDED — all other code unchanged.

   Changes vs original:
     1. render() now calls initProductStockUI() after rendering
     2. addToCart() checks live stock before adding
   ============================================================ */

const id = new URLSearchParams(location.search).get('id');
let product     = null;
let currentIdx  = 0;
let selectedSize  = null;
let selectedColor = null;

/* ──── Media helpers ──── */
function imgUrl(s) {
  return s?.startsWith('http') ? s : API_BASE + s;
}

const VIDEO_EXT = /\.(mp4|webm|mov|avi|ogg)$/i;
function isVideo(src) {
  return VIDEO_EXT.test(src || '');
}

function getMedia() {
  const imgs = (product.images || []).map(s => ({ src: s, type: 'image' }));
  const vids = (product.videos || []).map(s => ({ src: s, type: 'video' }));
  return [...imgs, ...vids];
}

/* ──── Load product from API ──── */
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

/* ──── Full render ──── */
function render() {
  if (!product) return;

  document.title = product.name + ' · Shenova';

  const bc = document.getElementById('pdp-bc-name');
  if (bc) bc.textContent = product.name;

  const catEl = document.getElementById('pdp-category');
  if (catEl && product.category) catEl.textContent = product.category;

  document.querySelector('#pdp-name').textContent  = product.name;
  document.querySelector('#pdp-price').textContent = '₹' + product.price.toLocaleString();
  document.querySelector('#pdp-desc').textContent  =
    product.description || 'Crafted with the finest fabrics for an effortless silhouette.';

  const media = getMedia();
  renderMainMedia(0);
  updateCounter();

  /* ── Thumbnail strip (desktop) ── */
  const thumbsWrap = document.querySelector('#pdp-thumbs');
  if (thumbsWrap) {
    thumbsWrap.innerHTML = media.map((m, i) => {
      if (m.type === 'video') {
        return `
          <div class="pdp-thumb-item ${i === 0 ? 'active' : ''}"
               onclick="setMedia(${i})" data-idx="${i}"
               title="Video ${i + 1}">
            <video class="pdp-thumb-video"
                   src="${imgUrl(m.src)}"
                   autoplay muted loop playsinline
                   preload="auto"
                   style="width:80px;height:106px;object-fit:cover;border-radius:4px;display:block;pointer-events:none"></video>
            <div class="pdp-thumb-play-icon">▶</div>
          </div>`;
      }
      return `
        <img src="${imgUrl(m.src)}"
             class="${i === 0 ? 'active' : ''}"
             onclick="setMedia(${i})"
             data-idx="${i}"
             alt="View ${i + 1}">`;
    }).join('');
  }

  /* ── Mobile dots ── */
  const dotsWrap = document.getElementById('pdp-dots');
  if (dotsWrap) {
    dotsWrap.innerHTML = media.map((m, i) => {
      const cls = m.type === 'video' ? 'pdp-dot pdp-dot-video' : 'pdp-dot';
      return `<span class="${cls} ${i === 0 ? 'active' : ''}" onclick="setMedia(${i})"></span>`;
    }).join('');
  }

  /* ── Sizes ── */
  document.querySelector('#pdp-sizes').innerHTML =
    (product.sizes || ['XS', 'S', 'M', 'L']).map(s =>
      `<button class="size" onclick="setSize('${s}',this)"><span>${s}</span></button>`
    ).join('');

  /* ── Colors ── */
  const colors = product.colors || [];
  const colorWrap = document.querySelector('#pdp-colors-wrap');
  if (colorWrap) colorWrap.style.display = colors.length ? 'block' : 'none';
  document.querySelector('#pdp-colors').innerHTML = colors.map(c =>
    `<button class="color" style="background:${c}" onclick="setColor('${c}',this)" title="${c}"></button>`
  ).join('');

  /* ── Wishlist state ── */
  const wishIds = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const pid = product._id || product.id;
  if (wishIds.includes(pid)) {
    document.querySelector('#pdp-wish')?.classList.add('active');
  }

  loadRelated();
  animateInfoIn();

  /* ══════════════════════════════════════════════════════════
     STOCK MANAGEMENT — fetch live stock after product renders
     initProductStockUI() is defined in stock.js
  ══════════════════════════════════════════════════════════ */
  if (window.initProductStockUI) {
    initProductStockUI(product._id || product.id);
  }
}

/* ──── Render main media slot (image or video) ──── */
function renderMainMedia(idx) {
  const media = getMedia();
  if (!media.length) return;

  const frame = document.getElementById('pdp-main-frame');
  if (!frame) return;

  const item = media[idx];

  frame.querySelectorAll(
    '#pdp-main-img, #pdp-main-video, .pdp-video-overlay-play'
  ).forEach(el => el.remove());

  if (item.type === 'video') {
    const vid = document.createElement('video');
    vid.id          = 'pdp-main-video';
    vid.src         = imgUrl(item.src);
    vid.controls    = false;
    vid.autoplay    = true;
    vid.muted       = true;
    vid.loop        = true;
    vid.playsInline = true;
    vid.preload     = 'auto';
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.setAttribute('disablepictureinpicture', '');
    vid.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
    Object.assign(vid.style, {
      width: '100%', height: '100%',
      objectFit: 'cover',
      borderRadius: '3px',
      display: 'block',
      cursor: 'default',
      pointerEvents: 'none'
    });

    vid.addEventListener('contextmenu', e => e.preventDefault());

    function ensurePlaying() {
      if (vid.paused) vid.play().catch(() => {});
    }
    vid.addEventListener('pause', ensurePlaying);
    vid.addEventListener('ended', ensurePlaying);

    if (window._pdpVidObserver) window._pdpVidObserver.disconnect();
    window._pdpVidObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
      });
    }, { threshold: 0.25 });
    window._pdpVidObserver.observe(vid);

    frame.insertBefore(vid, frame.firstChild);
    vid.play().catch(() => {});
    frame.style.cursor = 'default';

  } else {
    const img = document.createElement('img');
    img.id  = 'pdp-main-img';
    img.src = imgUrl(item.src);
    img.alt = 'Product';
    Object.assign(img.style, {
      width: '100%', height: '100%',
      objectFit: 'cover',
      transition: 'transform 2s cubic-bezier(.25,.46,.45,.94), opacity .22s ease',
      cursor: 'zoom-in',
      display: 'block'
    });

    frame.insertBefore(img, frame.firstChild);

    img.addEventListener('click', function() {
      const overlay = document.getElementById('pdp-zoom-overlay');
      const zoomImg = document.getElementById('pdp-zoom-img');
      if (overlay && zoomImg) {
        zoomImg.src = this.src;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });

    frame.style.cursor = '';
  }
}

/* ──── Switch active media item ──── */
window.setMedia = function(i) {
  const media = getMedia();
  if (i < 0 || i >= media.length) return;

  const prevVid = document.getElementById('pdp-main-video');
  if (prevVid) {
    if (window._pdpVidObserver) { window._pdpVidObserver.disconnect(); window._pdpVidObserver = null; }
    prevVid.pause();
  }

  currentIdx = i;

  const frame = document.getElementById('pdp-main-frame');
  const currentMain = frame?.querySelector('#pdp-main-img, #pdp-main-video');
  if (currentMain) {
    currentMain.style.opacity   = '0';
    currentMain.style.transform = 'scale(1.025)';
  }

  setTimeout(() => {
    renderMainMedia(i);
    const newMain = frame?.querySelector('#pdp-main-img, #pdp-main-video');
    if (newMain) {
      newMain.style.opacity   = '1';
      newMain.style.transform = 'scale(1)';
    }
  }, 180);

  document.querySelectorAll('#pdp-thumbs img, #pdp-thumbs .pdp-thumb-item').forEach((t, k) =>
    t.classList.toggle('active', k === i)
  );
  document.querySelectorAll('.pdp-dot').forEach((d, k) =>
    d.classList.toggle('active', k === i)
  );

  updateCounter();
};

window.setImg = function(i) { window.setMedia(i); };

function updateCounter() {
  const total = getMedia().length;
  const cur   = document.getElementById('pdp-img-cur');
  const tot   = document.getElementById('pdp-img-total');
  if (cur) cur.textContent = currentIdx + 1;
  if (tot) tot.textContent = total;
}

window.nextImg = () => {
  const total = getMedia().length;
  window.setMedia((currentIdx + 1) % (total || 1));
};
window.prevImg = () => {
  const total = getMedia().length;
  window.setMedia((currentIdx - 1 + (total || 1)) % (total || 1));
};

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

/* ──── Add to cart ──── */
/* ══════════════════════════════════════════════════════════════
   STOCK CHECK added before pushing to cart.
   Fetches live stock from API; blocks add if out of stock.
   On API failure, falls back to allowing the add (fail-open).
══════════════════════════════════════════════════════════════ */
window.addToCart = async function() {
  if (!selectedSize && !_customMeasurements) {
    showModal('Select your size', 'Please choose a size before adding to your bag.');
    const sizesEl = document.querySelector('#pdp-sizes');
    if (sizesEl) {
      sizesEl.style.animation = 'none';
      sizesEl.offsetHeight;
      sizesEl.style.animation = 'pdpShake 0.4s ease';
    }
    return;
  }

  /* ── Live stock check before adding ── */
  const productId = product._id || product.id;
  if (window.fetchLiveStock) {
    const liveStock = await fetchLiveStock(productId);
    if (liveStock !== null && liveStock === 0) {
      showModal('Out of Stock', 'This product is currently out of stock. Please check back later.');
      applyStockState(0);
      return;
    }
  }

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartImage = product.images?.[0] ? imgUrl(product.images[0]) : '';

  cart.push({
    id:    productId,
    name:  product.name,
    price: product.price,
    image: cartImage,
    size:  selectedSize || (_customMeasurements ? 'Custom' : null),
    color: selectedColor,
    qty:   1
  });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  openCart();

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

/* ──── Buy Now — sirf yeh ek product checkout pe bhejo ──── */
window.buyNow = async function() {
  if (!selectedSize && !_customMeasurements) {
    showModal('Select your size', 'Please choose a size before continuing.');
    const sizesEl = document.querySelector('#pdp-sizes');
    if (sizesEl) {
      sizesEl.style.animation = 'none';
      sizesEl.offsetHeight;
      sizesEl.style.animation = 'pdpShake 0.4s ease';
    }
    return;
  }

  /* Live stock check */
  const productId = product._id || product.id;
  if (window.fetchLiveStock) {
    const liveStock = await fetchLiveStock(productId);
    if (liveStock !== null && liveStock === 0) {
      showModal('Out of Stock', 'This product is currently out of stock. Please check back later.');
      applyStockState(0);
      return;
    }
  }

  const cartImage = product.images?.[0] ? imgUrl(product.images[0]) : '';

  /*
   * FIX: checkout.js sirf localStorage 'cart' padhta hai.
   * Isliye:
   *   1. Pehle ka cart backup karo (_cartBackup mein)
   *   2. 'cart' ko sirf is ek product se overwrite karo
   *   3. buyNowMode flag set karo taaki checkout ke baad
   *      cart restore ho sake (optional — aap checkout.html mein
   *      window.addEventListener('pageshow') se restore kar sakte ho)
   */
  const prevCart = localStorage.getItem('cart') || '[]';
  localStorage.setItem('_cartBackup', prevCart);
  localStorage.setItem('buyNowMode', '1');
  localStorage.setItem('cart', JSON.stringify([{
    id:    productId,
    name:  product.name,
    price: product.price,
    image: cartImage,
    size:  selectedSize || (_customMeasurements ? 'Custom' : null),
    color: selectedColor,
    qty:   1
  }]));

  /* Visual feedback then redirect */
  const btn = document.getElementById('pdp-buy-btn');
  if (btn) {
    btn.innerHTML = '<span>Going to checkout…</span>';
    btn.style.background = '#2d7a50';
    btn.style.color = '#fff';
    btn.style.borderColor = '#2d7a50';
  }
  setTimeout(() => {
    window.location.href = 'checkout.html';
  }, 380);
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

/* ──── Zoom ──── */
window.closeZoom = function() {
  document.getElementById('pdp-zoom-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
};

/* ──── Related products ──── */
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

/* ──── Info panel stagger animation ──── */
function animateInfoIn() {
  const targets = [
    '.pdp-eyebrow', '.pdp-title', '.pdp-price-row', '.pdp-rating',
    '.pdp-rule', '.pdp-desc', '.pdp-opt', '.pdp-cta', '.pdp-trust', '.pdp-acc'
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
  const vid = document.getElementById('pdp-main-video');
  if (vid && document.activeElement === vid) return;
  if (e.key === 'ArrowRight') window.nextImg?.();
  if (e.key === 'ArrowLeft')  window.prevImg?.();
  if (e.key === 'Escape')   { window.closeZoom?.(); }
});

/* ──── Size guide ──── */
window.openSizeGuide  = () => document.getElementById('sizeGuide')?.classList.add('active');
window.closeSizeGuide = () => document.getElementById('sizeGuide')?.classList.remove('active');

/* ──── Init ──── */
loadProduct();

/* ══════════════════════════════════════════════════════════════
   CUSTOM SIZE MODAL — UNCHANGED FROM ORIGINAL
══════════════════════════════════════════════════════════════ */

let _customMeasurements = null;

window.openCustomSizeModal = function() {
  if (_customMeasurements) {
    const m = _customMeasurements;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('csm-bust',    m.bust);
    setVal('csm-waist',   m.waist);
    setVal('csm-hip',     m.hip);
    setVal('csm-shoulder',m.shoulder);
    setVal('csm-length',  m.length);
    setVal('csm-sleeve',  m.sleeve);
    setVal('csm-notes',   m.notes);
  }
  document.getElementById('csm-error').textContent = '';
  document.getElementById('csm-overlay').classList.add('csm-open');
  document.getElementById('csm-panel').classList.add('csm-open');
  document.body.style.overflow = 'hidden';
};

window.closeCustomSizeModal = function() {
  document.getElementById('csm-overlay').classList.remove('csm-open');
  document.getElementById('csm-panel').classList.remove('csm-open');
  document.body.style.overflow = '';
};

window.saveCustomSize = function(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('csm-error');
  errEl.textContent = '';

  form.querySelectorAll('input').forEach(i => i.classList.remove('csm-invalid'));

  const fields = [
    { id: 'csm-bust',     key: 'bust',     label: 'Bust' },
    { id: 'csm-waist',    key: 'waist',    label: 'Waist' },
    { id: 'csm-hip',      key: 'hip',      label: 'Hip' },
    { id: 'csm-shoulder', key: 'shoulder', label: 'Shoulder' },
    { id: 'csm-length',   key: 'length',   label: 'Length' },
    { id: 'csm-sleeve',   key: 'sleeve',   label: 'Sleeve Length' },
  ];

  const data = {};
  const errors = [];

  fields.forEach(f => {
    const el  = document.getElementById(f.id);
    const val = el.value.trim();
    if (!val) {
      errors.push(f.label);
      el.classList.add('csm-invalid');
    } else {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        errors.push(f.label + ' must be a valid positive number');
        el.classList.add('csm-invalid');
      } else {
        data[f.key] = num;
      }
    }
  });

  if (errors.length) {
    errEl.textContent = 'Please fill in: ' + errors.join(', ') + '.';
    return;
  }

  data.notes = document.getElementById('csm-notes').value.trim();
  _customMeasurements = data;

  const badge = document.getElementById('pdp-custom-saved-badge');
  if (badge) badge.style.display = 'inline-flex';

  closeCustomSizeModal();
};

/* ── Patch addToCart to attach measurements (re-wrap the async version) ── */
const _stockWrappedAddToCart = window.addToCart;
window.addToCart = async function() {
  await _stockWrappedAddToCart();
  if (_customMeasurements) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length) {
      cart[cart.length - 1].customSize = _customMeasurements;
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }
};