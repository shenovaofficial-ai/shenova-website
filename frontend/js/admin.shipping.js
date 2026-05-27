/* ================================================================
   admin.shipping.js — SHENOVA Shipping Management
   ================================================================
   ADD THIS SCRIPT to your dashboard.html (before closing </body>)
   Or include via: <script src="admin.shipping.js"></script>

   WHAT THIS DOES:
   ✅ Intercepts order status changes to "shipped"
   ✅ Opens premium shipping details modal
   ✅ Saves courier/tracking data via PUT /api/orders/:id
   ✅ Triggers automated emails via the backend
   ✅ Shows shipping info inside the order drawer
   ✅ Adds all new status values to dropdowns
   ✅ Toast notifications for success/error
   ✅ Does NOT break any existing admin functionality
   ================================================================ */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────── */
  // Uses the same API variable as your existing admin.js
  const getAPI = () => (typeof API !== 'undefined' ? API : (typeof window.API !== 'undefined' ? window.API : ''));

  /* ════════════════════════════════════════════════════════════
     TOAST NOTIFICATION
  ════════════════════════════════════════════════════════════ */
  function showToast(message, type = 'success') {
    let toast = document.getElementById('shenova-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'shenova-toast';
      toast.className = 'shenova-toast';
      document.body.appendChild(toast);
    }
    toast.className = `shenova-toast ${type}`;
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.classList.remove('show'), 3800);
    });
  }

  /* ════════════════════════════════════════════════════════════
     SHIPPING MODAL — HTML INJECTION
  ════════════════════════════════════════════════════════════ */
  function injectShippingModal() {
    if (document.getElementById('shipping-modal')) return;

    const html = `
      <div id="shipping-modal" class="shipping-modal" role="dialog" aria-modal="true" aria-labelledby="sm-title">
        <div class="shipping-modal__overlay" id="sm-overlay"></div>
        <div class="shipping-modal__box">

          <!-- Header -->
          <div class="shipping-modal__header">
            <div class="shipping-modal__header-left">
              <div class="shipping-modal__icon">✈️</div>
              <div>
                <div class="shipping-modal__title" id="sm-title">Mark as Shipped</div>
                <div class="shipping-modal__subtitle">Enter courier & tracking details</div>
              </div>
            </div>
            <button class="shipping-modal__close" id="sm-close" aria-label="Close">✕</button>
          </div>

          <!-- Order strip -->
          <div style="padding:0 32px 4px;">
            <div class="shipping-modal__order-strip">
              <div>
                <div class="shipping-modal__order-strip-label">Order</div>
                <div class="shipping-modal__order-strip-value" id="sm-order-id">—</div>
              </div>
              <div style="text-align:right;">
                <div class="shipping-modal__order-strip-label">Customer</div>
                <div class="shipping-modal__order-strip-value" id="sm-customer">—</div>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="shipping-modal__body">

            <!-- Courier Name -->
            <div class="sfield">
              <label>Courier Partner <span class="required">*</span></label>
              <input id="sm-courier" type="text" placeholder="e.g. Delhivery, DTDC, Blue Dart, Ekart…" autocomplete="off">
            </div>

            <!-- Tracking ID -->
            <div class="sfield">
              <label>Tracking ID / AWB Number <span class="required">*</span></label>
              <input id="sm-tracking-id" type="text" placeholder="e.g. DEL123456789IN" autocomplete="off" style="letter-spacing:0.05em;">
            </div>

            <!-- Tracking URL + Est. Date (2-col) -->
            <div class="srow2">
              <div class="sfield">
                <label>Tracking URL <span class="optional-badge">Optional</span></label>
                <input id="sm-tracking-url" type="url" placeholder="https://track.courier.com/…">
              </div>
              <div class="sfield">
                <label>Est. Delivery Date <span class="optional-badge">Optional</span></label>
                <input id="sm-est-date" type="date">
              </div>
            </div>

            <!-- Info note -->
            <div style="display:flex;align-items:flex-start;gap:10px;background:#faf8f5;border:1px solid #ede8e0;border-radius:12px;padding:14px 16px;">
              <span style="font-size:18px;flex-shrink:0;">📧</span>
              <div style="font-size:12px;color:#888;line-height:1.6;">
                A <strong style="color:#111;">premium shipping confirmation email</strong> will be automatically sent to the customer with the tracking details.
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="shipping-modal__footer">
            <button class="shipping-modal__btn-cancel" id="sm-btn-cancel">Cancel</button>
            <button class="shipping-modal__btn-confirm" id="sm-btn-confirm">
              <div class="btn-spinner"></div>
              <span class="btn-label">Confirm Shipment</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('sm-overlay').addEventListener('click', closeShippingModal);
    document.getElementById('sm-close').addEventListener('click', closeShippingModal);
    document.getElementById('sm-btn-cancel').addEventListener('click', closeShippingModal);
    document.getElementById('sm-btn-confirm').addEventListener('click', confirmShipment);
  }

  /* ── Modal state ─────────────────────────────────────────── */
  let _pendingOrderId   = null;
  let _pendingOrderData = null;
  let _pendingSelect    = null; // the <select> that triggered the modal

  function openShippingModal(orderId, orderData, selectEl) {
    injectShippingModal();
    _pendingOrderId   = orderId;
    _pendingOrderData = orderData;
    _pendingSelect    = selectEl;

    document.getElementById('sm-order-id').textContent  = '#' + String(orderId).slice(-6).toUpperCase();
    document.getElementById('sm-customer').textContent  = orderData?.shipping?.fullName || 'Customer';

    // Clear fields
    ['sm-courier','sm-tracking-id','sm-tracking-url','sm-est-date'].forEach(id => {
      document.getElementById(id).value = '';
      document.getElementById(id).classList.remove('error');
    });

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sm-est-date').min = today;

    const modal = document.getElementById('shipping-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('sm-courier').focus(), 350);
  }

  function closeShippingModal() {
    const modal = document.getElementById('shipping-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Revert the select back to its previous value
    if (_pendingSelect) {
      _pendingSelect.value = _pendingSelect.dataset.prevValue || 'pending';
    }

    _pendingOrderId   = null;
    _pendingOrderData = null;
    _pendingSelect    = null;
  }

  /* ── Confirm shipment ─────────────────────────────────────── */
  async function confirmShipment() {
    const courierEl    = document.getElementById('sm-courier');
    const trackingEl   = document.getElementById('sm-tracking-id');
    const urlEl        = document.getElementById('sm-tracking-url');
    const estDateEl    = document.getElementById('sm-est-date');

    const courierName  = courierEl.value.trim();
    const trackingId   = trackingEl.value.trim();
    const trackingUrl  = urlEl.value.trim();
    const estimatedDate = estDateEl.value
      ? new Date(estDateEl.value).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
      : '';

    // Validate required fields
    let valid = true;
    [courierEl, trackingEl].forEach(el => {
      el.classList.remove('error');
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
    });
    if (!valid) { showToast('Please fill in Courier Name and Tracking ID', 'error'); return; }

    const btn = document.getElementById('sm-btn-confirm');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const res = await fetch(`${getAPI()}/orders/${_pendingOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'shipped',
          courierName,
          trackingId,
          trackingUrl,
          estimatedDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }

      const updated = await res.json();

      // Close modal
      const modal = document.getElementById('shipping-modal');
      modal.classList.remove('active');
      document.body.style.overflow = '';

      // Update the select element (keep it on 'shipped')
      if (_pendingSelect) {
        _pendingSelect.dataset.prevValue = 'shipped';
        _pendingSelect.value = 'shipped';
      }

      showToast('✈️  Order marked as Shipped — confirmation email sent!', 'success');

      // Refresh dashboard data
      if (typeof loadDash === 'function') loadDash();

      _pendingOrderId   = null;
      _pendingOrderData = null;
      _pendingSelect    = null;

    } catch (err) {
      console.error('[ShippingModal] Error:', err);
      showToast('❌ ' + (err.message || 'Failed to update order'), 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  /* ════════════════════════════════════════════════════════════
     OVERRIDE updOrder — intercept "shipped" status changes
     Also sends automatic emails for other status changes
  ════════════════════════════════════════════════════════════ */
  window._originalUpdOrder = window.updOrder;

  window.updOrder = async function (id, status, orderData, selectEl) {
    // Store previous value on the select for revert-on-cancel
    if (selectEl) selectEl.dataset.prevValue = selectEl.dataset.currentValue || status;

    if (status === 'shipped') {
      openShippingModal(id, orderData, selectEl);
      return; // do NOT call API yet — modal handles it
    }

    // For all other statuses: call API and send automated emails
    try {
      const res = await fetch(`${getAPI()}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Update failed');

      const statusMessages = {
        out_for_delivery: '🚚 Order marked as Out For Delivery — customer notified!',
        delivered:        '❤️  Order marked as Delivered — customer notified!',
        cancelled:        '❌ Order cancelled — customer notified.',
        processing:       '⚙️  Order status updated to Processing.',
        pending:          '🔄 Order status updated to Pending.',
      };

      showToast(statusMessages[status] || `Status updated to ${status}`, 'success');

      if (selectEl) selectEl.dataset.currentValue = status;
      if (typeof loadDash === 'function') loadDash();

    } catch (err) {
      showToast('❌ Failed to update order status', 'error');
      if (selectEl) selectEl.value = selectEl.dataset.prevValue || 'pending';
    }
  };

  /* ════════════════════════════════════════════════════════════
     OVERRIDE openDrawer — add shipping info card + new statuses
  ════════════════════════════════════════════════════════════ */
  window._originalOpenDrawer = window.openDrawer;

  window.openDrawer = function (o) {
    // Call original drawer open
    if (typeof window._originalOpenDrawer === 'function') {
      window._originalOpenDrawer(o);
    }

    // Replace the order controls section with enhanced version
    setTimeout(() => {
      const drawerBody = document.querySelector('#drawer-body');
      if (!drawerBody) return;

      // ── Remove existing Order Controls card and re-add enhanced ──
      const cards = drawerBody.querySelectorAll('.info-card');
      let controlCard = null;
      cards.forEach(c => {
        if (c.querySelector('h4') && c.querySelector('h4').textContent.includes('Order Controls')) {
          controlCard = c;
        }
      });

      if (controlCard) {
        controlCard.innerHTML = `
          <h4>Order Controls</h4>
          <div class="status-select-wrap">
            <select
              id="drawer-status-select"
              data-current-value="${o.status}"
              data-prev-value="${o.status}"
              onchange="window.updOrder('${o._id}', this.value, ${JSON.stringify(o).replace(/"/g, '&quot;')}, this)"
            >
              ${['pending','processing','shipped','out_for_delivery','delivered','cancelled'].map(s =>
                `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`
              ).join('')}
            </select>
          </div>
        `;
      }

      // ── Inject shipping info card if order is shipped/delivered ──
      if (o.shippingInfo && (o.shippingInfo.courierName || o.shippingInfo.trackingId)) {
        const si = o.shippingInfo;
        const existingShipCard = drawerBody.querySelector('#ship-info-card');
        if (!existingShipCard) {
          const trackBtnHtml = si.trackingUrl
            ? `<a href="${si.trackingUrl}" target="_blank" rel="noopener noreferrer" class="track-link-btn">🔗 Track on Courier Site</a>`
            : '';

          const estDate = si.estimatedDate
            ? `<div class="shipping-info-row"><span class="sir-label">Est. Delivery</span><span class="sir-value" style="color:#27a35a;">${si.estimatedDate}</span></div>`
            : '';

          const shipCard = document.createElement('div');
          shipCard.id = 'ship-info-card';
          shipCard.className = 'info-card shipping-info-card';
          shipCard.innerHTML = `
            <h4>Shipping Details</h4>
            ${si.courierName  ? `<div class="shipping-info-row"><span class="sir-label">Courier</span><span class="sir-value">${si.courierName}</span></div>` : ''}
            ${si.trackingId   ? `<div class="shipping-info-row"><span class="sir-label">Tracking ID</span><span class="sir-value" style="font-family:monospace;letter-spacing:0.05em;">${si.trackingId}</span></div>` : ''}
            ${estDate}
            ${si.shippedAt    ? `<div class="shipping-info-row"><span class="sir-label">Shipped On</span><span class="sir-value">${new Date(si.shippedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>` : ''}
            ${si.deliveredAt  ? `<div class="shipping-info-row"><span class="sir-label">Delivered On</span><span class="sir-value" style="color:#27a35a;">${new Date(si.deliveredAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>` : ''}
            ${trackBtnHtml}
          `;

          // Insert before the Order Controls card
          if (controlCard) {
            drawerBody.insertBefore(shipCard, controlCard);
          } else {
            drawerBody.appendChild(shipCard);
          }
        }
      }
    }, 60);
  };

  /* ════════════════════════════════════════════════════════════
     UPDATE ORDER CARDS in dashboard — add out_for_delivery badge
  ════════════════════════════════════════════════════════════ */

  // Patch the badge CSS if out_for_delivery isn't already styled
  const styleEl = document.createElement('style');
  styleEl.textContent = `.badge.out_for_delivery, .out_for_delivery { background:#e8f5e9; color:#2e7d32; }`;
  document.head.appendChild(styleEl);

  /* ── Keyboard: ESC closes modal ──────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('shipping-modal');
      if (modal && modal.classList.contains('active')) closeShippingModal();
    }
  });

  console.log('✅ [SHENOVA Shipping] admin.shipping.js loaded');

})();
