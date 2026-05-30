/* ================================================================
   essentials.js — SHENOVA Essentials Section
   Homepage mein sirf 4 products, hover effect nahi (1 image only)
   ================================================================ */

(function () {
  'use strict';

  const ESSENTIALS_CATS = [
    'essentials','jewellery','jewelry','accessories','accessory',
    'earring','necklace','ring','bracelet','anklet','pendant',
    'hair','scrunchie','clip','pin'
  ];

  function imgUrl(src) {
    if (!src) return '';
    return src.startsWith('http')
      ? src
      : (window.API_BASE || 'https://shenova-backend.onrender.com') + src;
  }

  /* ── Card — NO hover-img, NO opacity swap, just subtle zoom ── */
  function essProductCard(p) {
    const href = 'product-essentials.html?id=' + (p._id || p.id);
    const img1 = p.images?.[0] ? imgUrl(p.images[0]) : '';

    return `
    <div class="product-card ess-card">
      <a href="${href}">
        <div class="product-image">
          <img class="main-img" src="${img1}" alt="${p.name}">
          <button class="quick-btn"
                  onclick='openQuickView(event, ${JSON.stringify(p)})'>
            QUICK VIEW
          </button>
        </div>
      </a>
      <div class="product-info">
        <div class="product-title">${p.name}</div>
        <div class="product-price">&#8377;${Number(p.price).toLocaleString()}</div>
      </div>
    </div>`;
  }

  /* ── Disable hover-img swap ONLY for essentials cards ── */
  function injectEssStyle() {
    if (document.getElementById('ess-card-style')) return;
    const s = document.createElement('style');
    s.id = 'ess-card-style';
    s.textContent = `
      /* Essentials cards: no opacity-swap hover — only subtle zoom */
      .ess-card .product-image .main-img {
        opacity: 1 !important;
        transform: scale(1);
        transition: transform 0.7s cubic-bezier(.19,1,.22,1) !important;
      }
      .ess-card:hover .product-image .main-img {
        opacity: 1 !important;
        transform: scale(1.04) !important;
      }
      .ess-card .product-image .hover-img { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  async function initEssentials() {
    const track = document.getElementById('shnv-ess-track');
    if (!track) return;

    injectEssStyle();

    try {
      const base = window.API
        || ((window.API_BASE || 'https://shenova-backend.onrender.com') + '/api');
      const r = await fetch(base + '/products');
      if (!r.ok) throw new Error('Non-200');

      const products = await r.json();
      const ess = products
        .filter(p => {
          const cat = (p.category || '').toLowerCase().trim();
          return ESSENTIALS_CATS.some(kw => cat.includes(kw));
        })
        .slice(0, 4); // sirf 4 homepage par

      if (ess.length > 0) {
        track.innerHTML = ess.map(essProductCard).join('');
        if (typeof addTapFeedback === 'function') addTapFeedback();
      }

    } catch (err) {
      console.log('[Essentials] fetch failed — placeholders shown:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEssentials);
  } else {
    initEssentials();
  }

})();