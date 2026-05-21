/* ============================================================
   product.js — Shenova PDP Logic
   Fixed: video autoplay (muted + loop + playsInline) on PDP.
   IntersectionObserver pauses video when scrolled off-screen.
   ============================================================ */

const id = new URLSearchParams(location.search).get('id');
let product      = null;
let currentIdx   = 0;
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

/* ──── PDP Video viewport observer ──── */
// Pauses the main PDP video when it is scrolled out of view,
// resumes when it comes back. Prevents background battery drain.
let _pdpVideoObserver = null;

function _observePdpVideo(vid) {
  if (_pdpVideoObserver) _pdpVideoObserver.disconnect();

  _pdpVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const p = vid.play();
        if (p !== undefined) p.catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, { threshold: 0.2 });

  _pdpVideoObserver.observe(vid);
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

  /* ── Main frame ── */
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
                   muted
                   playsinline
                   preload="metadata"
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
}

/* ──── Render main media slot (image or video) ──── */
function renderMainMedia(idx) {
  const media = getMedia();
  if (!media.length) return;

  const frame = document.getElementById('pdp-main-frame');
  if (!frame) return;

  const item = media[idx];

  // Stop observing the old video before removing it
  if (_pdpVideoObserver) _pdpVideoObserver.disconnect();

  // Remove existing main media (keep badges/arrows/counter)
  frame.querySelectorAll(
    '#pdp-main-img, #pdp-main-video, .pdp-video-overlay-play'
  ).forEach(el => el.remove());

  if (item.type === 'video') {
    const vid = document.createElement('video');
    vid.id          = 'pdp-main-video';
    vid.src         = imgUrl(item.src);

    // ── Autoplay attributes (all required for cross-browser support) ──
    vid.autoplay    = true;
    vid.muted       = true;    // required for autoplay in every browser
    vid.loop        = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');         // iOS Safari
    vid.setAttribute('webkit-playsinline', '');  // older iOS
    vid.setAttribute('disablepictureinpicture', '');
    vid.disableRemotePlayback = true;

    // Keep controls so the user can pause / seek if they want
    vid.controls = true;

    // Preload enough to start playing immediately
    vid.preload = 'auto';

    Object.assign(vid.style, {
      width: '100%', height: '100%',
      objectFit: 'cover',
      borderRadius: '3px',
      display: 'block',
      cursor: 'default'
    });

    frame.insertBefore(vid, frame.firstChild);
    frame.style.cursor = 'default';

    // Start playing; use IntersectionObserver to pause when off-screen
    _observePdpVideo(vid);

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
    frame.style.cursor = '';

    img.addEventListener('click', function() {
      const overlay = document.getElementById('pdp-zoom-overlay');
      const zoomImg = document.getElementById('pdp-zoom-img');
      if (overlay && zoomImg) {
        zoomImg.src = this.src;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  }
}

/* ──── Switch active media item ──── */
window.setMedia = function(i) {
  const media = getMedia();
  if (i < 0 || i >= media.length) return;

  // Pause and stop observing old video
  const prevVid = document.getElementById('pdp-main-video');
  if (prevVid) {
    prevVid.pause();
    if (_pdpVideoObserver) _pdpVideoObserver.disconnect();
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

/* ──── Counter ──── */
function updateCounter() {
  const total = getMedia().length;
  const cur   = document.getElementById('pdp-img-cur');
  const tot   = document.getElementById('pdp-img-total');
  if (cur) cur.textContent = currentIdx + 1;
  if (tot) tot.textContent = total;
}

/* ──── Arrow navigation ──── */
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
window.addToCart = function() {
  if (!selectedSize) {
    showModal('Select your size', 'Please choose a size before adding to your bag.');
    const sizesEl = document.querySelector('#pdp-sizes');
    if (sizesEl) {
      sizesEl.style.animation = 'none';
      sizesEl.offsetHeight;
      sizesEl.style.animation = 'pdpShake 0.4s ease';
    }
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartImage = product.images?.[0] ? imgUrl(product.images[0]) : '';

  cart.push({
    id:    product._id || product.id,
    name:  product.name,
    price: product.price,
    image: cartImage,
    size:  selectedSize,
    color: selectedColor,
    qty:   1
  });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  openCart();

  const btn = document.querySelector('.pdp-add-btn');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML        = '<span>Added ✓</span>';
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
    const r  = await fetch(API + '/products');
    let list = await r.json();
    if (!list.length) list = sampleProducts();
    list = list.filter(p => (p._id || p.id) !== (product._id || product.id)).slice(0, 4);
    wrap.innerHTML = list.map(productCard).join('');
    // Wire video autoplay on related cards too
    if (typeof window.initCardVideos === 'function') window.initCardVideos(wrap);
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
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(16px)';
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
  if (e.key === 'Escape')     window.closeZoom?.();
});

/* ──── Size guide ──── */
window.openSizeGuide  = () => document.getElementById('sizeGuide')?.classList.add('active');
window.closeSizeGuide = () => document.getElementById('sizeGuide')?.classList.remove('active');

/* ──── Init ──── */
loadProduct();