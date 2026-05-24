/* ================================================================
   stock.js — SHENOVA Real-Time Stock Management (Frontend)
   ================================================================
   Include in product.html and checkout.html:
       <script src="js/stock.js"></script>  (after main.js)

   Provides:
     • fetchLiveStock(productId)   — get current stock from API
     • applyStockState(stock)      — update UI for out-of-stock / low stock
     • validateCartStock()         — pre-payment check (used in checkout)

   Does NOT break any existing JS. Additive only.
   ================================================================ */

/* ── Shenova API base (inherits from main.js if loaded, else fallback) ── */
const STOCK_API = (window.API || '') || (
  window.location.hostname.includes('localhost')
    ? 'http://localhost:5000/api'
    : 'https://shenova-backend.onrender.com/api'
);

/* ════════════════════════════════════════════════════════════════
   fetchLiveStock
   Returns the live stock number for a product ID.
   Falls back to null on network error so UI degrades gracefully.
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
   Mutates the product page DOM based on live stock value.
   Handles: out of stock, low stock warning, in-stock label.
   Called after fetchLiveStock on product.html.
════════════════════════════════════════════════════════════════ */
function applyStockState(stock) {
  /* ── Remove any existing stock badge so we don't duplicate ── */
  document.getElementById('shenova-stock-badge')?.remove();

  const addBtn  = document.querySelector('.pdp-add-btn');
  const wishBtn = document.querySelector('.pdp-wish-btn');
  const qtyWrap = document.querySelector('#pdp-sizes');

  /* ── Build badge element ── */
  const badge = document.createElement('div');
  badge.id = 'shenova-stock-badge';

  if (stock === null) {
    /* Network error — show nothing, don't block purchase */
    return;
  }

  if (stock === 0) {
    /* ── OUT OF STOCK ── */
    badge.className = 'stock-badge stock-oos';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-oos"></span>
      Out of Stock
    `;

    /* Disable add-to-cart */
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<span>Out of Stock</span>';
      addBtn.classList.add('pdp-add-btn--disabled');
    }

    /* Disable size selection interaction */
    if (qtyWrap) qtyWrap.classList.add('pdp-sizes--disabled');

    console.log('[Stock] Product is OUT OF STOCK');

  } else if (stock <= 3) {
    /* ── LOW STOCK WARNING ── */
    badge.className = 'stock-badge stock-low';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-low"></span>
      Only ${stock} piece${stock === 1 ? '' : 's'} left
    `;

    /* Re-enable buttons (in case of a re-render) */
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (qtyWrap) qtyWrap.classList.remove('pdp-sizes--disabled');

    console.log(`[Stock] LOW STOCK — ${stock} remaining`);

  } else {
    /* ── IN STOCK (comfortable level) ── */
    badge.className = 'stock-badge stock-ok';
    badge.innerHTML = `
      <span class="stock-dot stock-dot-ok"></span>
      In Stock
    `;

    if (addBtn) {
      addBtn.disabled = false;
      addBtn.classList.remove('pdp-add-btn--disabled');
    }
    if (qtyWrap) qtyWrap.classList.remove('pdp-sizes--disabled');

    console.log(`[Stock] In stock — ${stock} units`);
  }

  /* ── Insert badge above the CTA row ── */
  const ctaRow = document.querySelector('.pdp-cta-row') || document.querySelector('.pdp-cta');
  if (ctaRow) {
    ctaRow.parentNode.insertBefore(badge, ctaRow);
  }
}

/* ════════════════════════════════════════════════════════════════
   initProductStockUI
   Call this from product.html once product data is loaded.
   Fetches live stock and applies UI state.

   Usage (add to bottom of product.js loadProduct() callback):
       await initProductStockUI(product._id || product.id);
════════════════════════════════════════════════════════════════ */
window.initProductStockUI = async function(productId) {
  if (!productId) return;
  const stock = await fetchLiveStock(productId);
  applyStockState(stock);
  return stock;
};

/* ════════════════════════════════════════════════════════════════
   validateCartStock
   Pre-payment validation. Call before opening Razorpay modal.
   Returns: { ok: true } or { ok: false, message: "..." }

   Usage in checkout.html (before Razorpay opens):
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
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
    console.warn('[Stock] validateCartStock network error (non-blocking):', err.message);
    /* Fail-open: if validation endpoint is unreachable, don't block payment */
    return { ok: true };
  }
};
