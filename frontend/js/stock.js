/* ================================================================
   stock.js — SHENOVA Real-Time Stock Management (Frontend)
   ================================================================
   Include in product.html and checkout.html:
       <script src="js/stock.js"></script>  (after main.js / style.css)

   Public API (on window):
     initProductStockUI(productId)  — PDP: fetch stock & apply UI
     validateCartStock()            — checkout: pre-payment check
     fetchLiveStock(productId)      — utility: returns stock number | null
     applyStockState(stock)         — utility: mutates PDP DOM

   Backward-compatible. Does NOT break any existing JS.
   ================================================================ */

/* ── Config ─────────────────────────────────────────────────────── */
const STOCK_API = (window.API || (
  window.location.hostname.includes('localhost')
    ? 'http://localhost:5000/api'
    : 'https://shenova-backend.onrender.com/api'
));

const LOW_STOCK_THRESHOLD = 5; // must match server

/* ════════════════════════════════════════════════════════════════
   fetchLiveStock
   Returns { stock, stockStatus } or null on failure.
════════════════════════════════════════════════════════════════ */
async function fetchLiveStock(productId) {
  try {
    const r = await fetch(`${STOCK_API}/stock/${productId}`);
    if (!r.ok) throw new Error('Non-200');
    const data = await r.json();
    return typeof data.stock === 'number' ? data.stock : null;
  } catch (err) {
    console.warn('[Stock] fetchLiveStock failed:', err.message);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   applyStockState
   Mutates PDP DOM to reflect live stock level.
   Handles: out-of-stock, low-stock, and in-stock states.
════════════════════════════════════════════════════════════════ */
function applyStockState(stock) {
  /* Remove any existing badge so we don't duplicate */
  document.getElementById('shenova-stock-badge')?.remove();

  const addBtn  = document.querySelector('.pdp-add-btn');
  const buyBtn  = document.querySelector('.pdp-buy-btn');   // Buy Now if exists
  const wishBtn = document.querySelector('.pdp-wish-btn');
  const qtyWrap = document.querySelector('#pdp-sizes');

  const badge = document.createElement('div');
  badge.id = 'shenova-stock-badge';

  if (stock === null) {
    /* Network error — fail open, show nothing */
    return;
  }

  if (stock <= 0) {
    /* ── OUT OF STOCK ─────────────────────────────────────── */
    badge.className = 'stock-badge stock-oos';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-oos"></span>
      Out of Stock
    `;

    /* Disable Add to Cart */
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<span>Out of Stock</span>';
      addBtn.classList.add('pdp-add-btn--disabled');
    }

    /* Disable Buy Now */
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.classList.add('pdp-add-btn--disabled');
    }

    /* Grey out size selection */
    if (qtyWrap) qtyWrap.classList.add('pdp-sizes--disabled');

    /* Store OOS state so addToCart double-checks */
    window.__shenovaStockLevel = 0;

    console.log('[Stock] ⛔ Product is OUT OF STOCK');

  } else if (stock <= LOW_STOCK_THRESHOLD) {
    /* ── LOW STOCK ────────────────────────────────────────── */
    badge.className = 'stock-badge stock-low';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-low"></span>
      Only ${stock} piece${stock === 1 ? '' : 's'} left — order soon!
    `;

    /* Re-enable buttons (guard against previous OOS state) */
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (qtyWrap) qtyWrap.classList.remove('pdp-sizes--disabled');

    /* Store live stock so cart quantity can be capped */
    window.__shenovaStockLevel = stock;

    console.log(`[Stock] ⚠️ LOW STOCK — ${stock} remaining`);

  } else {
    /* ── IN STOCK ─────────────────────────────────────────── */
    badge.className = 'stock-badge stock-ok';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-ok"></span>
      In Stock
    `;

    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (qtyWrap) qtyWrap.classList.remove('pdp-sizes--disabled');

    window.__shenovaStockLevel = stock;

    console.log(`[Stock] ✅ In stock — ${stock} units`);
  }

  /* Insert badge above CTA row */
  const ctaRow = document.querySelector('.pdp-cta-row') || document.querySelector('.pdp-cta');
  if (ctaRow) {
    ctaRow.parentNode.insertBefore(badge, ctaRow);
  }
}

/* ════════════════════════════════════════════════════════════════
   initProductStockUI
   Call from product.js after product data is loaded.
   Fetches live stock, applies DOM state, returns stock number.

   Usage (already called in product.js render()):
       if (window.initProductStockUI) {
         await initProductStockUI(product._id || product.id);
       }
════════════════════════════════════════════════════════════════ */
window.initProductStockUI = async function(productId) {
  if (!productId) return;
  const stock = await fetchLiveStock(productId);
  applyStockState(stock);
  return stock;
};

/* ════════════════════════════════════════════════════════════════
   validateCartStock
   Pre-payment validation called from checkout.html.
   Returns: { ok: true } or { ok: false, message: "..." }

   Usage (already integrated in checkout.html):
       const check = await validateCartStock();
       if (!check.ok) { alert(check.message); return; }
════════════════════════════════════════════════════════════════ */
window.validateCartStock = async function() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!cart.length) return { ok: true };

    const items = cart.map(i => ({
      id:   i.id || i._id,
      name: i.name,
      qty:  Number(i.qty) || 1
    }));

    console.log('[Stock] Pre-payment validation — items:', items);

    const r = await fetch(`${STOCK_API}/stock/validate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items })
    });

    const data = await r.json();
    console.log('[Stock] Validation response:', data);

    if (!data.ok) {
      return {
        ok: false,
        message: '⚠️ Stock issue:\n\n' + (data.errors || []).join('\n') +
          '\n\nPlease update your cart and try again.'
      };
    }

    return { ok: true };
  } catch (err) {
    /* Fail-open: if validation endpoint is unreachable, don't block payment */
    console.warn('[Stock] validateCartStock network error (non-blocking):', err.message);
    return { ok: true };
  }
};

/* ════════════════════════════════════════════════════════════════
   applyCartItemStockWarnings  (checkout page)
   Reads cart from localStorage, fetches each product's live stock,
   and shows a warning banner if any item exceeds available stock.
   Call from checkout.html DOMContentLoaded.
════════════════════════════════════════════════════════════════ */
window.applyCartItemStockWarnings = async function() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!cart.length) return;

    for (const item of cart) {
      const productId = item.id || item._id;
      if (!productId) continue;

      const liveStock = await fetchLiveStock(productId);
      if (liveStock === null) continue; // network fail — skip

      if (liveStock <= 0) {
        _showCheckoutStockWarning(
          `"${item.name}" is now out of stock and cannot be ordered.`,
          'error'
        );
      } else if (Number(item.qty) > liveStock) {
        _showCheckoutStockWarning(
          `"${item.name}": you have ${item.qty} in cart but only ${liveStock} available.`,
          'warn'
        );
      }
    }
  } catch (e) {
    console.warn('[Stock] applyCartItemStockWarnings error:', e.message);
  }
};

function _showCheckoutStockWarning(message, type = 'warn') {
  const existing = document.getElementById('shenova-checkout-stock-warn');
  if (existing) {
    existing.innerHTML += `<div>• ${message}</div>`;
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'shenova-checkout-stock-warn';
  banner.style.cssText = `
    background: ${type === 'error' ? 'rgba(185,28,28,0.08)' : 'rgba(194,120,3,0.08)'};
    border: 1px solid ${type === 'error' ? 'rgba(185,28,28,0.25)' : 'rgba(194,120,3,0.28)'};
    color: ${type === 'error' ? '#991b1b' : '#854d0e'};
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    line-height: 1.6;
    margin-bottom: 18px;
    font-family: var(--co-sans, 'DM Sans', sans-serif);
  `;
  banner.innerHTML = `<strong>⚠️ Stock Warning</strong><div style="margin-top:6px">• ${message}</div>`;

  /* Insert above the checkout form */
  const form = document.getElementById('checkout-form') || document.querySelector('.co-form-box');
  if (form) form.parentNode.insertBefore(banner, form);
}

/* ════════════════════════════════════════════════════════════════
   Product card badge helper (for listing pages / related products)
   Adds a small stock badge to a rendered product card.

   Usage: after rendering a product card, call
       addStockBadgeToCard(cardEl, stock)
════════════════════════════════════════════════════════════════ */
window.addStockBadgeToCard = function(cardEl, stock) {
  if (!cardEl || stock === null) return;

  /* Remove any old badge */
  cardEl.querySelector('.card-stock-badge')?.remove();

  const n = Number(stock) || 0;

  if (n <= 0) {
    const b = document.createElement('div');
    b.className = 'card-stock-badge card-stock-oos';
    b.textContent = 'Out of Stock';
    cardEl.querySelector('.prod-img, .card-img-wrap, figure')?.appendChild(b);
  } else if (n <= LOW_STOCK_THRESHOLD) {
    const b = document.createElement('div');
    b.className = 'card-stock-badge card-stock-low';
    b.textContent = `Only ${n} left`;
    cardEl.querySelector('.prod-img, .card-img-wrap, figure')?.appendChild(b);
  }
};

/* ── Expose utilities for product.js ── */
window.fetchLiveStock  = fetchLiveStock;
window.applyStockState = applyStockState;