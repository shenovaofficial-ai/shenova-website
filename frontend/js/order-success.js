/* ================================================================
   order-success.js — SHENOVA Luxury Order Confirmation
   ================================================================
   USAGE:
     1. Drop this file → js/order-success.js
     2. Link from order-success.html (already done in the HTML)
     3. Replace the popup block in checkout.html with the redirect
        snippet shown at the bottom of this file.
   ================================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     1. LOAD ORDER DATA from sessionStorage
        (Written by checkout.html just before redirect)
  ══════════════════════════════════════════════ */
  const raw = sessionStorage.getItem('shnova_last_order');
  const order = raw ? JSON.parse(raw) : null;

  /* Guard: if page is refreshed with no data, gracefully degrade */
  if (!order) {
    console.warn('[Shenova] No order data found in sessionStorage.');
  }

  /* ══════════════════════════════════════════════
     2. GENERATE / RESTORE ORDER ID
  ══════════════════════════════════════════════ */
  function generateOrderId() {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 89999);
    return `SHN-${year}-${rand}`;
  }

  // Use backend _id suffix if available, else generate display ID
  const displayOrderId =
    (order && order.backendId)
      ? 'SHN-' + String(order.backendId).slice(-8).toUpperCase()
      : (order && order.orderId) || generateOrderId();

  /* ══════════════════════════════════════════════
     3. POPULATE HERO
  ══════════════════════════════════════════════ */
  const nameEl = document.getElementById('sc-customer-name');
  if (nameEl && order && order.shipping && order.shipping.fullName) {
    const firstName = order.shipping.fullName.split(' ')[0];
    nameEl.textContent = firstName;
  }

  const orderIdEl = document.getElementById('sc-order-id');
  if (orderIdEl) orderIdEl.textContent = displayOrderId;

  /* ══════════════════════════════════════════════
     4. COPY ORDER ID BUTTON
  ══════════════════════════════════════════════ */
  const copyBtn = document.getElementById('sc-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(displayOrderId).then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 2000);
      });
    });
  }

  /* ══════════════════════════════════════════════
     5. POPULATE ORDER ITEMS
  ══════════════════════════════════════════════ */
  const itemsList = document.getElementById('sc-items-list');
  if (itemsList && order && order.items && order.items.length) {
    itemsList.innerHTML = order.items.map(function (it) {
      const imgSrc =
        (it.image || '').startsWith('http')
          ? it.image
          : (window.API_BASE || 'https://shenova-backend.onrender.com') + (it.image || '');

      return `
        <div class="sc-item">
          <img
            class="sc-item-img"
            src="${escHtml(imgSrc)}"
            alt="${escHtml(it.name || '')}"
            onerror="this.style.background='var(--co-light)';this.removeAttribute('src')"
          >
          <div class="sc-item-info">
            <div class="sc-item-name">${escHtml(it.name || 'Item')}</div>
            <div class="sc-item-meta">
              ${it.size ? escHtml(it.size) + ' &middot; ' : ''}Qty ${it.qty || 1}
            </div>
          </div>
          <div class="sc-item-price">₹${((it.price || 0) * (it.qty || 1)).toLocaleString('en-IN')}</div>
        </div>`;
    }).join('');
  } else if (itemsList) {
    itemsList.innerHTML = '<p style="color:var(--co-muted);font-size:13px;padding:12px 0;">Order details will appear here.</p>';
  }

  /* ══════════════════════════════════════════════
     6. POPULATE PAYMENT SUMMARY
  ══════════════════════════════════════════════ */
  if (order) {
    setText('sc-subtotal', order.subtotal != null ? '₹' + Number(order.subtotal).toLocaleString('en-IN') : '—');

    const shipFee = order.shippingFee;
    setText('sc-shipping', shipFee === 0 ? 'Free' : shipFee != null ? '₹' + Number(shipFee).toLocaleString('en-IN') : '—');

    setText('sc-total', order.total != null ? '₹' + Number(order.total).toLocaleString('en-IN') : '—');

    // Discount row
    if (order.discount && order.discount > 0) {
      show('sc-discount-row');
      setText('sc-discount', '−₹' + Number(order.discount).toLocaleString('en-IN'));
    }

    // COD rows
    if (order.isCOD) {
      show('sc-cod-row');
      setText('sc-cod-advance', '₹' + Number(order.codAdvancePaid || 100).toLocaleString('en-IN'));
      if (order.codRemainingAmount > 0) {
        show('sc-remaining-row');
        setText('sc-cod-remaining', '₹' + Number(order.codRemainingAmount).toLocaleString('en-IN'));
      }
    }

    // Payment method chip
    const methodLabel = document.getElementById('sc-pay-method-label');
    if (methodLabel) {
      methodLabel.textContent = order.isCOD
        ? 'Cash on Delivery (₹100 advance paid)'
        : (order.paymentMethod || 'Online Payment');
    }
  }

  /* ══════════════════════════════════════════════
     7. POPULATE DELIVERY INFO
  ══════════════════════════════════════════════ */
  const deliveryEl = document.getElementById('sc-delivery-info');
  if (deliveryEl && order && order.shipping) {
    const s = order.shipping;
    deliveryEl.innerHTML = `
      <div class="sc-delivery-name">${escHtml(s.fullName || '')}</div>
      <div class="sc-delivery-detail">
        ${escHtml(s.address || '')}<br>
        ${escHtml(s.city || '')}${s.state ? ', ' + escHtml(s.state) : ''} – ${escHtml(s.zip || '')}<br>
        ${escHtml(s.country || 'India')}<br>
        ${s.phone ? escHtml(s.phone) : ''}${s.email ? ' · ' + escHtml(s.email) : ''}
      </div>`;
  }

  /* ══════════════════════════════════════════════
     8. ESTIMATED DELIVERY DATE
  ══════════════════════════════════════════════ */
  function calcEta(minDays, maxDays) {
    const fmt = { day: 'numeric', month: 'long' };
    const now = new Date();
    const from = new Date(now); from.setDate(now.getDate() + minDays);
    const to   = new Date(now); to.setDate(now.getDate() + maxDays);
    return from.toLocaleDateString('en-IN', fmt) + ' – ' + to.toLocaleDateString('en-IN', fmt);
  }

  const eta = calcEta(5, 7);
  ['sc-eta', 'sc-eta-2'].forEach(id => setText(id, eta));

  // Pre-fill Track Order email subject with order ID
  const trackBtn = document.getElementById('sc-track-btn');
  if (trackBtn) {
    trackBtn.href = `mailto:support@shenova.com?subject=Track%20Order%20${encodeURIComponent(displayOrderId)}`;
  }

  /* ══════════════════════════════════════════════
     9. CONFETTI BURST (Minimal, luxury-grade)
  ══════════════════════════════════════════════ */
  (function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    // Luxury palette: gold, cream, blush, ink
    const COLORS = ['#b8956a','#e8ddd0','#d4b896','#c9a87c','#f0ece6','#0a0a0a'];
    const PARTICLE_COUNT = 90;
    const particles = [];

    class Particle {
      constructor() { this.reset(true); }
      reset(initial) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? (Math.random() * canvas.height * 0.4 - canvas.height * 0.1) : -12;
        this.size = Math.random() * 7 + 3;
        this.speedY = Math.random() * 2.5 + 1.2;
        this.speedX = (Math.random() - 0.5) * 1.4;
        this.angle  = Math.random() * Math.PI * 2;
        this.spin   = (Math.random() - 0.5) * 0.18;
        this.color  = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.shape  = Math.random() > 0.55 ? 'rect' : 'circle';
        this.alpha  = 1;
        this.life   = 1;
        this.decay  = Math.random() * 0.006 + 0.003;
      }
      update() {
        this.y     += this.speedY;
        this.x     += this.speedX;
        this.angle += this.spin;
        this.life  -= this.decay;
        this.alpha  = Math.max(0, this.life);
        if (this.y > canvas.height + 20 || this.life <= 0) this.reset(false);
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if (this.shape === 'rect') {
          ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    let frame = 0;
    const MAX_FRAMES = 220; // ~3.6 seconds at 60fps

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      frame++;
      if (frame < MAX_FRAMES) {
        requestAnimationFrame(animate);
      } else {
        // Fade out canvas
        let opacity = 1;
        const fade = setInterval(() => {
          opacity -= 0.04;
          canvas.style.opacity = Math.max(0, opacity);
          if (opacity <= 0) { clearInterval(fade); canvas.style.display = 'none'; }
        }, 30);
      }
    }

    // Slight delay so page paints first
    setTimeout(animate, 400);
  })();

  /* ══════════════════════════════════════════════
     10. TIMELINE ANIMATION (stagger in)
  ══════════════════════════════════════════════ */
  const steps = document.querySelectorAll('.sc-timeline-step');
  steps.forEach(function (step, i) {
    step.style.opacity = '0';
    step.style.transform = 'translateX(-12px)';
    step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    setTimeout(function () {
      step.style.opacity = '1';
      step.style.transform = 'translateX(0)';
    }, 900 + i * 130);
  });

  /* ══════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════ */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();


/* ================================================================
   ██████████████████████████████████████████████████████████████
   CHECKOUT.HTML — REPLACEMENT SNIPPET
   ██████████████████████████████████████████████████████████████

   In checkout.html, find this block inside the Razorpay handler
   (starting around line 970):

   ┌─ REMOVE THIS (old alert + redirect) ───────────────────────┐
   │                                                             │
   │  if (cod) {                                                 │
   │    const remaining = Math.max(0, sub2 - disc2);            │
   │    alert(`✅ COD Order Confirmed!\n\n₹100 advance...`);    │
   │  } else {                                                   │
   │    alert('✅ Payment Successful & Order Placed!...');       │
   │  }                                                          │
   │  setTimeout(() => { window.location.href = 'index.html' }, │
   │    1500);                                                   │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘

   REPLACE WITH THIS:
   ─────────────────────────────────────────────────────────────
   // Store order data for the success page
   const successData = {
     orderId:           displayOrderId,          // auto-generated above
     backendId:         saved._id || '',         // from backend response
     shipping:          orderData.shipping,
     items:             cart2,
     subtotal:          sub2,
     shippingFee:       ship2,
     discount:          disc2,
     total:             total2,
     paymentMethod:     paymentMethod,
     isCOD:             cod,
     codAdvancePaid:    cod ? COD_ADVANCE : 0,
     codRemainingAmount: cod ? Math.max(0, sub2 - disc2) : 0,
     razorpayPaymentId: response.razorpay_payment_id,
   };

   // Generate a display-friendly order ID (same logic as order-success.js)
   const year = new Date().getFullYear();
   const rand  = Math.floor(10000 + Math.random() * 89999);
   var displayOrderId = saved._id
     ? 'SHN-' + String(saved._id).slice(-8).toUpperCase()
     : `SHN-${year}-${rand}`;
   successData.orderId = displayOrderId;

   sessionStorage.setItem('shnova_last_order', JSON.stringify(successData));
   window.location.href = 'order-success.html';
   ─────────────────────────────────────────────────────────────

   NOTE: The rest of the handler (coupon use, cart clear, etc.)
   remains UNCHANGED above this block.
   ================================================================ */
