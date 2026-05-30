/* ================================================================
   essentials.js — SHENOVA Essentials Section
   Populates #shnv-ess-track using EXACT same productCard() HTML
   as main.js — so cards look pixel-identical to Trending Now.

   SAFE: Does NOT modify any existing cart, checkout, or product logic.
   Load AFTER main.js in index.html.
   ================================================================ */

(function () {
  'use strict';

  const ESSENTIALS_CATS = ['essentials', 'jewellery', 'accessories'];

  function imgUrl(src) {
    if (!src) return '';
    return src.startsWith('http')
      ? src
      : (window.API_BASE || 'https://shenova-backend.onrender.com') + src;
  }

  /* ── Card HTML — mirrors productCard() in main.js exactly ── */
  function essProductCard(p) {
    const href  = 'product-essentials.html?id=' + (p._id || p.id);
    const img1  = p.images?.[0] ? imgUrl(p.images[0]) : '';
    const img2  = p.images?.[1] ? imgUrl(p.images[1]) : '';

    return `
    <div class="product-card">
      <a href="${href}">
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
        <div class="product-price">₹${Number(p.price).toLocaleString()}</div>
      </div>
    </div>`;
  }

  /* ── Main init ── */
  async function initEssentials() {
    const track = document.getElementById('shnv-ess-track');
    if (!track) return;

    try {
      const base = window.API
        || ((window.API_BASE || 'https://shenova-backend.onrender.com') + '/api');
      const r = await fetch(base + '/products');
      if (!r.ok) throw new Error('Non-200');

      const products = await r.json();
      const ess = products.filter(p =>
        ESSENTIALS_CATS.includes((p.category || '').toLowerCase())
      );

      if (ess.length > 0) {
        /* Replace placeholder cards with real products — same grid structure */
        track.innerHTML = ess.map(essProductCard).join('');

        /* Re-run tap feedback from luxury-v4.js if available */
        if (typeof addTapFeedback === 'function') addTapFeedback();
      }
      /* If no essentials yet, placeholder cards remain */

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