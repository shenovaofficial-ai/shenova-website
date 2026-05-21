/* ================================================================
   SHENOVA — bottomnav.js
   Premium mobile bottom navigation logic
   Load at end of <body> in all pages, after main.js
   ================================================================ */

(function () {
  'use strict';

  /* ── Active page detection ─────────────────────────────────────── */
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const pageMap = {
    'index.html':    'home',
    '':              'home',
    'shop.html':     'shop',
    'about.html':    'about',
    'contact.html':  'contact',
    'product.html':  'shop',   // product detail — highlight Shop
    'checkout.html': 'shop',
    'wishlist.html': 'shop',
  };

  const activePage = pageMap[page] || 'home';

  /* ── Mark active tab ───────────────────────────────────────────── */
  document.querySelectorAll('.shn-nav-item[data-page]').forEach(function (el) {
    if (el.dataset.page === activePage) {
      el.classList.add('shn-active');
    }
  });

  /* ── Cart badge sync ───────────────────────────────────────────── */
  function syncCartBadge() {
    try {
      var cart  = JSON.parse(localStorage.getItem('cart') || '[]');
      var count = cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0);
      var badge = document.querySelector('.shn-nav-cart-badge');
      if (!badge) return;
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.toggle('visible', count > 0);
    } catch (e) { /* silent */ }
  }

  syncCartBadge();

  /* Re-sync whenever localStorage changes (other tabs / cart updates) */
  window.addEventListener('storage', syncCartBadge);

  /* Patch cart mutators from main.js to also refresh badge */
  var _origChange = window.changeQty;
  var _origRemove = window.removeItem;

  if (_origChange) {
    window.changeQty = function () {
      _origChange.apply(this, arguments);
      syncCartBadge();
    };
  }
  if (_origRemove) {
    window.removeItem = function () {
      _origRemove.apply(this, arguments);
      syncCartBadge();
    };
  }

  /* Also hook into cart open/close for drawer-open body class */
  var _origOpen  = window.openCart;
  var _origClose = window.closeCart;

  if (_origOpen) {
    window.openCart = function () {
      _origOpen.apply(this, arguments);
      document.body.classList.add('drawer-open');
    };
  }
  if (_origClose) {
    window.closeCart = function () {
      _origClose.apply(this, arguments);
      document.body.classList.remove('drawer-open');
    };
  }

  /* ── Cart icon tap → open cart drawer ─────────────────────────── */
  var cartTab = document.querySelector('.shn-nav-item[data-page="cart"]');
  if (cartTab) {
    cartTab.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.openCart === 'function') {
        window.openCart();
      }
    });
  }

  /* ── Scale pop on tap (non-active items) ───────────────────────── */
  document.querySelectorAll('.shn-nav-item').forEach(function (el) {
    el.addEventListener('touchstart', function () {
      var icon = this.querySelector('.shn-nav-icon');
      if (icon && !this.classList.contains('shn-active')) {
        icon.style.transform = 'scale(0.88)';
      }
    }, { passive: true });

    el.addEventListener('touchend', function () {
      var icon = this.querySelector('.shn-nav-icon');
      if (icon && !this.classList.contains('shn-active')) {
        icon.style.transform = '';
      }
    }, { passive: true });

    el.addEventListener('touchcancel', function () {
      var icon = this.querySelector('.shn-nav-icon');
      if (icon) icon.style.transform = '';
    }, { passive: true });
  });

  /* ── Observe addToCart calls to refresh badge ──────────────────── */
  /* Patch localStorage.setItem to catch cart updates from any source */
  var _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (key === 'cart') syncCartBadge();
  };

})();