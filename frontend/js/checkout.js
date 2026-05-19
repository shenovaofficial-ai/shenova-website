/* ================================================================
   checkout.js — SHENOVA Luxury Checkout
   ================================================================
   ALL original backend logic is fully preserved:
   - renderSummary()       → cart items + shipping calc
   - coupon apply API      → POST /api/coupon/apply
   - coupon use API        → POST /api/coupon/use
   - order creation API    → POST /api/orders
   - localStorage cart     → read / clear
   - updateCartCount()     → inherited from main.js

   New additions (UI only, no backend changes):
   - Luxury item card HTML for summary sidebar
   - Loading state on submit button
   - Premium modal icon (success / error)
   - Discount row reveal in sidebar
   - showModal() / alert() mapping to luxury modal
   ================================================================ */

/* ── CUSTOM ALERT → maps to luxury modal (no browser dialogs) ── */
window.alert = function(title, msg) {
  /* Support both single-arg (legacy alert) and two-arg (custom) */
  if (msg === undefined) {
    msg   = title;
    title = '';
  }
  showLuxuryModal(title, msg);
};

/* ── LUXURY MODAL SHOW ── */
function showLuxuryModal(title, msg, type) {
  /* type: 'success' | 'error' | '' */
  const modal   = document.querySelector('.co-modal');
  const iconWrap = document.getElementById('co-modal-icon');
  const h3       = modal?.querySelector('h3');
  const p        = modal?.querySelector('p');

  if (!modal) return;

  /* Icon */
  if (iconWrap) {
    iconWrap.className = 'co-modal-icon';
    if (type === 'success') {
      iconWrap.classList.add('success');
      iconWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconWrap.classList.add('error');
      iconWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else {
      iconWrap.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }
  }

  if (h3) h3.textContent = title;
  if (p)  p.textContent  = msg;
  modal.classList.add('show', 'open');
}

/* ── RENDER SUMMARY (original logic; luxury HTML output) ── */
function renderSummary() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const wrap = document.querySelector('#summary-items');
  if (!wrap) return;

  if (!cart.length) {
    wrap.innerHTML = `<div class="co-items-empty">Your bag is empty.</div>`;
    document.querySelector('#sub').textContent  = '₹0';
    document.querySelector('#ship').textContent = '—';
    document.querySelector('#tot').textContent  = '₹0';
    return;
  }

  /* ── Luxury item cards ── */
  wrap.innerHTML = cart.map(it => {
    const imgSrc = it.image?.startsWith('http')
      ? it.image
      : API_BASE + it.image;

    return `
      <div class="co-item">
        <img
          class="co-item-img"
          src="${imgSrc}"
          alt="${it.name}"
          onerror="this.style.background='var(--co-light)'"
        >
        <div class="co-item-info">
          <div class="co-item-name">${it.name}</div>
          <div class="co-item-meta">${it.size || '—'} &middot; Qty ${it.qty}</div>
        </div>
        <div class="co-item-price">₹${(it.price * it.qty).toLocaleString()}</div>
      </div>
    `;
  }).join('');

  /* ── Pricing (original calc unchanged) ── */
  const sub  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = sub > 2000 ? 0 : 69;

  document.querySelector('#sub').textContent  = '₹' + sub.toLocaleString();
  document.querySelector('#ship').textContent = ship ? '₹' + ship : 'Free';
  document.querySelector('#tot').textContent  = '₹' + (sub + ship).toLocaleString();
}

/* ── INITIAL RENDER ── */
renderSummary();

/* ── SUBMIT HANDLER (all original logic preserved) ── */
document
  .querySelector('#checkout-form')
  .addEventListener('submit', async e => {
    e.preventDefault();

    const f   = e.target;
    const btn = document.getElementById('place-order-btn');

    /* Cart check */
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (!cart.length) {
      showLuxuryModal(
        'Your bag is empty',
        'Please add items to your bag before placing an order.',
        'error'
      );
      return;
    }

    /* ── Pricing (same as original) ── */
    const sub  = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const ship = sub > 2000 ? 0 : 69;

    /* ─────────────── COUPON (original API call) ─────────────── */
    let discountAmount = 0;

    if (f.coupon.value) {
      try {
        const cr = await fetch(
          API + '/coupon/apply',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coupon: f.coupon.value })
          }
        );

        const cd = await cr.json();

        if (!cr.ok) {
          showLuxuryModal('Coupon Error', cd.message, 'error');
          return;
        }

        discountAmount = sub * (cd.discount / 100);
        window.appliedDiscount = discountAmount; // ← ADD THIS LINE

        /* Show discount row in sidebar */
        const discRow = document.getElementById('co-discount-row');
        const discVal = document.getElementById('co-discount-val');
        if (discRow) discRow.style.display = 'flex';
        if (discVal) discVal.textContent = '−₹' + discountAmount.toLocaleString();

        /* Update total display */
        document.querySelector('#tot').textContent =
          '₹' + (sub + ship - discountAmount).toLocaleString();

      } catch (err) {
        showLuxuryModal('Coupon Error', 'Coupon validation failed. Please try again.', 'error');
        return;
      }
    }

    /* ─────────────── ORDER BODY (unchanged from original) ──── */
    const body = {
      items: cart.map(i => ({
        name:  i.name,
        image: i.image,
        price: i.price,
        size:  i.size,
        color: i.color,
        qty:   i.qty
      })),
      shipping: {
        fullName: f.fullName.value,
        email:    f.email.value,
        phone:    f.phone.value,
        address:  f.address.value,
        city:     f.city.value,
        state:    f.state.value,
        zip:      f.zip.value,
        country:  f.country.value
      },
      paymentMethod: f.payment.value,
      coupon:        f.coupon.value,
      subtotal:      sub,
      shippingFee:   ship,
      discount:      discountAmount,
      total:         (sub + ship) - discountAmount
    };

    /* ─────────────── UX: LOADING STATE ──────────────────────── */
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
      btn.querySelector('.co-submit-text').textContent = 'Placing Order';
    }

    try {
      /* ─────────────── CREATE ORDER (original API) ─────────── */
      const r = await fetch(
        API + '/orders',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body)
        }
      );

      if (!r.ok) throw 0;

      const res = await r.json();

      /* ─────────────── MARK COUPON USED (original) ─────────── */
      if (f.coupon.value) {
        await fetch(
          API + '/coupon/use',
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ coupon: f.coupon.value })
          }
        );
      }

      /* ─────────────── SUCCESS ─────────────────────────────── */
      localStorage.removeItem('cart');
      updateCartCount();

      showLuxuryModal(
        'Order Placed ✦',
        'Your order has been successfully placed! We\'ll send a confirmation to your email shortly.',
        'success'
      );

const modalBtn = document.querySelector('.co-modal-btn');

if (modalBtn) {
  modalBtn.addEventListener('click', () => {
    document
      .querySelector('.co-modal')
      ?.classList.remove('show', 'open');

    window.location.href = 'index.html';
  });
}

    } catch (err) {
      console.error('[Checkout] Order failed:', err);
      showLuxuryModal(
        'Order Failed',
        'Something went wrong while placing your order. Please try again.',
        'error'
      );
    }

    /* ─────────────── RESET BUTTON ───────────────────────────── */
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.querySelector('.co-submit-text').textContent = 'Place Order';
    }
  });
