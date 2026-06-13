/* ================================================================
   checkout.js — SHENOVA Luxury Checkout
   ================================================================
   Handles:
   - renderSummary()  → cart items + pricing in sidebar
   - updateCartCount() inherited from main.js

   NOTE: Coupon logic, Razorpay payment, and order submission
   are all handled by the inline <script> in checkout.html.
   This file only renders the summary sidebar.
   ================================================================ */

/* ── RENDER SUMMARY ── */
function renderSummary() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const wrap = document.querySelector('#summary-items');
  if (!wrap) return;

  if (!cart.length) {
    wrap.innerHTML = `<div class="co-items-empty">Your bag is empty.</div>`;
    document.querySelector('#sub')  && (document.querySelector('#sub').textContent  = '₹0');
    document.querySelector('#ship') && (document.querySelector('#ship').textContent = '—');
    document.querySelector('#tot')  && (document.querySelector('#tot').textContent  = '₹0');
    return;
  }

  /* Luxury item cards */
  wrap.innerHTML = cart.map(it => {
    const imgSrc = (it.image || '').startsWith('http')
      ? it.image
      : (window.API_BASE || '') + (it.image || '');

    return `
      <div class="co-item">
        <img
          class="co-item-img"
          src="${imgSrc}"
          alt="${it.name}"
          onerror="this.style.background='var(--co-light,#ece6dc)'"
        >
        <div class="co-item-info">
          <div class="co-item-name">${it.name}</div>
          <div class="co-item-meta">${it.size || '—'} &middot; Qty ${it.qty}</div>
        </div>
        <div class="co-item-price">₹${(it.price * it.qty).toLocaleString()}</div>
      </div>
    `;
  }).join('');

  /* Pricing */
  const sub  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = sub > 2000 ? 0 : 0;
  const disc = window.appliedDiscount || 0;
  const tot  = Math.max(0, sub + ship - disc);

  document.querySelector('#sub')  && (document.querySelector('#sub').textContent  = '₹' + sub.toLocaleString());
  document.querySelector('#ship') && (document.querySelector('#ship').textContent = ship ? '₹' + ship : 'Free');
  document.querySelector('#tot')  && (document.querySelector('#tot').textContent  = '₹' + tot.toLocaleString());
}

/* ── INITIAL RENDER ── */
renderSummary();

/* ── BUY NOW MODE: Agar Buy Now se aaye hain toh cart icon count sahi dikhao ── */
/* Checkout complete hone ke baad (pageshow / order placed) cart restore hoga   */
window.addEventListener('pageshow', function(e) {
  /* Wapas product page pe gaye (back button) toh cart restore karo */
  if (localStorage.getItem('buyNowMode') === '1' && e.persisted) {
    const backup = localStorage.getItem('_cartBackup');
    if (backup !== null) localStorage.setItem('cart', backup);
    localStorage.removeItem('_cartBackup');
    localStorage.removeItem('buyNowMode');
  }
});

/* Order place hone ke baad call karo: restoreCartAfterBuyNow() */
window.restoreCartAfterBuyNow = function() {
  if (localStorage.getItem('buyNowMode') !== '1') return;
  const backup = localStorage.getItem('_cartBackup');
  if (backup !== null) localStorage.setItem('cart', backup);
  localStorage.removeItem('_cartBackup');
  localStorage.removeItem('buyNowMode');
};