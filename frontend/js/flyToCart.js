/* ================================================================
   SHENOVA · Fly-To-Cart Animation  |  flyToCart.js
   ─────────────────────────────────────────────────────────────────
   Premium "fly to cart" micro-interaction.
   Works with dynamically rendered product cards on index.html,
   shop.html, and product.html (PDP).

   HOW TO USE
   ──────────
   1. Drop this file in your /js/ folder.
   2. Add <script src="js/flyToCart.js"></script> AFTER main.js in
      every HTML page that has product cards OR an "Add to Cart" btn.
   3. That's it — the module wires itself automatically.

   INTEGRATION POINTS (matches your existing code exactly)
   ────────────────────────────────────────────────────────
   • Cart icon selector  : '.cart-btn'  (nav bar icon — main.js)
   • Product card img    : '.product-card .product-image img.main-img'
   • Quick-view btn      : '.quick-btn'  (openQuickView in main.js)
   • PDP add-to-cart btn : '.pdp-add-btn'  (product.js addToCart)
   • PDP main image      : '#pdp-main-img'
   • Public API          : window.flyToCart(imgSrc, fromEl)
                           — call from addToCart() in main.js / product.js

   ANIMATION SPEC
   ──────────────
   • Clone fades in at source, scales up slightly (1 → 0.18)
   • Travels along a gentle cubic-bezier arc toward the cart icon
   • Cart icon bounces via CSS spring once the clone arrives
   • Clone dissolves and is removed — zero layout shift
   • Multiple simultaneous flights are fully supported
   • Respects prefers-reduced-motion (skips to instant count bump)
   ================================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     1. DESIGN TOKENS  (mirrors your CSS vars)
  ───────────────────────────────────────────── */
  const DURATION   = 820;   // ms — total flight time
  const EASE       = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // --silk
  const CLONE_SIZE = 72;    // px — starting clone square
  const END_SCALE  = 0.18;  // how small the clone ends up at the cart
  const CART_BOUNCE_CLASS = 'ftc-cart-bounce';

  /* ─────────────────────────────────────────────
     2. INJECT STYLES  (one <style> tag, once)
  ───────────────────────────────────────────── */
  function injectStyles () {
    if (document.getElementById('ftc-styles')) return;
    const css = `
      /* ── Fly clone ───────────────────────── */
      .ftc-clone {
        position: fixed;
        z-index: 99999;
        border-radius: 50%;
        overflow: hidden;
        pointer-events: none;
        will-change: transform, opacity, border-radius;
        box-shadow: 0 8px 32px rgba(0,0,0,.22);
        /* starting opacity – JS fades it in */
        opacity: 0;
      }
      .ftc-clone img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 50%;
        pointer-events: none;
      }

      /* ── Cart bounce ─────────────────────── */
      @keyframes ftcBounce {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.32); }
        55%  { transform: scale(0.88); }
        75%  { transform: scale(1.14); }
        90%  { transform: scale(0.96); }
        100% { transform: scale(1); }
      }
      .${CART_BOUNCE_CLASS} {
        animation: ftcBounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
      }

      /* ── Cart count pop ──────────────────── */
      @keyframes ftcCountPop {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.5); }
        70%  { transform: scale(0.85); }
        100% { transform: scale(1); }
      }
      .ftc-count-pop {
        animation: ftcCountPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
      }
    `;
    const s = document.createElement('style');
    s.id          = 'ftc-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ─────────────────────────────────────────────
     3. HELPERS
  ───────────────────────────────────────────── */

  /** Returns the centre {x,y} of an element in viewport coords */
  function centre (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width  / 2,
             y: r.top  + r.height / 2 };
  }

  /** Find the cart icon button on the current page */
  function getCartEl () {
    return (
      document.querySelector('.cart-btn') ||
      document.querySelector('[data-cart]') ||
      document.querySelector('.nav-cart') ||
      null
    );
  }

  /** Animate a CSS property via rAF for one duration, using ease fn */
  function lerp (a, b, t) { return a + (b - a) * t; }

  /** Cubic-bezier approximation (matches --silk / --ease-out feel) */
  function easeOut (t) {
    // Approximation of cubic-bezier(0.16, 1, 0.3, 1) — fast start, gentle deceleration
    return 1 - Math.pow(1 - t, 3.8);
  }
  function easeInOut (t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ─────────────────────────────────────────────
     4. CORE ANIMATION
  ───────────────────────────────────────────── */

  /**
   * Triggers the fly-to-cart animation.
   *
   * @param {string}      imgSrc  — URL of the product image to clone
   * @param {HTMLElement} fromEl  — the source element to fly *from*
   *                                (usually the product image or button)
   */
  function flyToCart (imgSrc, fromEl) {

    /* Respect prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cartEl = getCartEl();
    if (!cartEl || !fromEl) return;

    const from = centre(fromEl);
    const to   = centre(cartEl);

    /* ── Build clone ── */
    const wrap = document.createElement('div');
    wrap.className = 'ftc-clone';
    wrap.style.cssText = `
      width:  ${CLONE_SIZE}px;
      height: ${CLONE_SIZE}px;
      left:   ${from.x - CLONE_SIZE / 2}px;
      top:    ${from.y - CLONE_SIZE / 2}px;
    `;

    const img = document.createElement('img');
    img.src = imgSrc;
    img.draggable = false;
    img.alt = '';
    wrap.appendChild(img);
    document.body.appendChild(wrap);

    /* ── Animation loop ── */
    const startTime = performance.now();
    // Arc height — proportional to travel distance, capped for subtlety
    const dist    = Math.hypot(to.x - from.x, to.y - from.y);
    const arcLift = Math.min(dist * 0.28, 120); // gentle luxurious arc

    let rafId;

    function tick (now) {
      const elapsed = now - startTime;
      const rawT    = Math.min(elapsed / DURATION, 1);
      const t       = easeOut(rawT);           // position progress
      const tArc    = Math.sin(rawT * Math.PI); // arc bell curve

      /* Position */
      const cx = lerp(from.x, to.x, t) - CLONE_SIZE / 2;
      const cy = lerp(from.y, to.y, t) - arcLift * tArc - CLONE_SIZE / 2;

      /* Scale: 1 → END_SCALE */
      const scale = lerp(1, END_SCALE, t);

      /* Opacity: fade in early, fade out near end */
      let opacity;
      if (rawT < 0.12)       opacity = rawT / 0.12;          // 0 → 1 fast fade-in
      else if (rawT > 0.75)  opacity = 1 - (rawT - 0.75) / 0.25; // 1 → 0 fade-out
      else                   opacity = 1;

      /* Border-radius: starts circular, stays circular */
      const br = CLONE_SIZE / 2;

      wrap.style.transform  = `translate(${cx - (from.x - CLONE_SIZE/2)}px, ${cy - (from.y - CLONE_SIZE/2)}px) scale(${scale})`;
      wrap.style.opacity    = opacity;
      wrap.style.borderRadius = `${br}px`;

      if (rawT < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        /* ── Cleanup ── */
        wrap.remove();
        cartBounce(cartEl);
        countPop();
      }
    }

    rafId = requestAnimationFrame(tick);

    /* Safety net: remove clone if tab goes hidden / user navigates */
    document.addEventListener('visibilitychange', function cleanup () {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        wrap.remove();
        document.removeEventListener('visibilitychange', cleanup);
      }
    });
  }

  /* ─────────────────────────────────────────────
     5. CART BOUNCE
  ───────────────────────────────────────────── */
  function cartBounce (cartEl) {
    /* Remove class if already animating (rapid adds) */
    cartEl.classList.remove(CART_BOUNCE_CLASS);
    void cartEl.offsetWidth; // force reflow to restart animation
    cartEl.classList.add(CART_BOUNCE_CLASS);
    cartEl.addEventListener('animationend', () => {
      cartEl.classList.remove(CART_BOUNCE_CLASS);
    }, { once: true });
  }

  function countPop () {
    document.querySelectorAll('.cart-count').forEach(el => {
      el.classList.remove('ftc-count-pop');
      void el.offsetWidth;
      el.classList.add('ftc-count-pop');
      el.addEventListener('animationend', () => {
        el.classList.remove('ftc-count-pop');
      }, { once: true });
    });
  }

  /* ─────────────────────────────────────────────
     6. PATCH addToCart IN main.js
        We wrap window.addToCart (set by main.js) so the animation
        fires before the original cart logic runs.
  ───────────────────────────────────────────── */
  function patchMainAddToCart () {
    const _orig = window.addToCart;
    if (typeof _orig !== 'function') return;

    window.addToCart = function (product, imgEl) {

      /* Determine source element for the fly animation */
      let sourceEl = imgEl || null;

      if (!sourceEl) {
        /* Try to find the image inside the focused / hovered product card */
        const activeCard = document.querySelector('.product-card:hover');
        if (activeCard) {
          sourceEl = activeCard.querySelector('.main-img') ||
                     activeCard.querySelector('img');
        }
      }

      if (!sourceEl) {
        /* Last-resort: the quick-view trigger or first visible product img */
        sourceEl = document.querySelector('#quick-modal .quick-img') ||
                   document.querySelector('.product-card .main-img');
      }

      /* Resolve image URL */
      const imgSrc = sourceEl?.src ||
                     (product.images?.[0]?.startsWith('http')
                       ? product.images[0]
                       : (window.API_BASE || '') + (product.images?.[0] || ''));

      if (sourceEl && imgSrc) {
        flyToCart(imgSrc, sourceEl);
      }

      /* Run original logic */
      return _orig.apply(this, arguments);
    };
  }

  /* ─────────────────────────────────────────────
     7. PATCH PDP addToCart IN product.js
        product.js defines window.addToCart differently (no product arg,
        reads the module-scoped `product` variable). We detect the PDP
        by checking for #pdp-main-img and wrap accordingly.
  ───────────────────────────────────────────── */
  function patchPDPAddToCart () {
    /* Only run on product.html */
    if (!document.querySelector('.pdp-add-btn')) return;

    const btn = document.querySelector('.pdp-add-btn');
    if (!btn) return;

    /* Intercept the button click BEFORE product.js handler */
    btn.addEventListener('click', function (e) {
      /* Don't prevent default — product.js still runs */
      const mainImg = document.querySelector('#pdp-main-img');
      if (!mainImg) return;

      /* Only animate if a size is already selected (product.js will
         show its own "select size" modal otherwise — we don't want
         to fly if the add is going to be blocked) */
      const sizeActive = document.querySelector('#pdp-sizes .size.active');
      if (!sizeActive) return;

      flyToCart(mainImg.src, mainImg);

    }, true /* capture — fires before product.js listener */ );
  }

  /* ─────────────────────────────────────────────
     8. QUICK-VIEW "Add to Bag" BUTTON
        The quick-view cart btn is built inside openQuickView() in
        main.js. We override it once the modal opens.
  ───────────────────────────────────────────── */
  function patchQuickView () {
    const _origOpen = window.openQuickView;
    if (typeof _origOpen !== 'function') return;

    window.openQuickView = function (e, product) {
      _origOpen.apply(this, arguments);

      /* Wait one tick for main.js to build the modal content */
      setTimeout(() => {
        const cartBtn = document.getElementById('quick-cart-btn');
        const qImg    = document.getElementById('quick-image');

        if (!cartBtn || !qImg) return;

        /* We clone the existing onclick, wrap it */
        const _origClick = cartBtn.onclick;
        cartBtn.onclick = function () {

          /* Only animate if size is picked (main.js guards this too) */
          const hasSize = window._quickSelectedSize ||
            document.querySelector('#quick-size-wrap .size-pill.active');

          if (hasSize && qImg.src) {
            flyToCart(qImg.src, qImg);
          }

          if (typeof _origClick === 'function') _origClick.apply(this, arguments);
        };
      }, 50);
    };
  }

  /* ─────────────────────────────────────────────
     9. DELEGATE — handles dynamically rendered cards
        Listens for clicks on the "QUICK VIEW" button
        or any [data-fly] trigger inside product cards.
  ───────────────────────────────────────────── */
  function attachDelegatedListeners () {

    document.addEventListener('click', function (e) {

      /* Quick View button inside a product card */
      const qBtn = e.target.closest('.quick-btn');
      if (qBtn) {
        const card   = qBtn.closest('.product-card');
        const mainImg = card?.querySelector('.main-img') || card?.querySelector('img');
        if (mainImg) {
          /* flyToCart will trigger when the quick-view cart btn is pressed
             (handled in patchQuickView). Here we just remember the card img
             as context so the quick-view patch can fall back to it. */
          window._ftcLastCardImg = mainImg;
        }
        return;
      }

      /* Any button/element with data-fly-cart="true" */
      const flyBtn = e.target.closest('[data-fly-cart]');
      if (flyBtn) {
        const imgSrc = flyBtn.dataset.flyCart;
        const sourceEl = flyBtn;
        if (imgSrc) flyToCart(imgSrc, sourceEl);
      }

    });
  }

  /* ─────────────────────────────────────────────
     10. INIT
  ───────────────────────────────────────────── */
  function init () {
    injectStyles();
    attachDelegatedListeners();

    /* Patch functions that may already exist,
       or defer until DOMContentLoaded / load */
    function applyPatches () {
      patchMainAddToCart();
      patchPDPAddToCart();
      patchQuickView();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyPatches);
    } else {
      applyPatches();
    }

    /* Re-apply patches if scripts load late (e.g. deferred main.js) */
    window.addEventListener('load', applyPatches);
  }

  /* ─────────────────────────────────────────────
     11. PUBLIC API
  ───────────────────────────────────────────── */
  /**
   * Manually trigger the animation from anywhere.
   *
   * Example (inside your addToCart):
   *   window.flyToCart(product.images[0], document.querySelector('#pdp-main-img'));
   */
  window.flyToCart = flyToCart;

  init();

})();