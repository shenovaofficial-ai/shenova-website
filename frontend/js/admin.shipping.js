/* ================================================================
   admin.shipping.js — SHENOVA Shipping Management v2
   ================================================================
   ✅ Intercepts order status changes to "shipped"
   ✅ Opens premium shipping details modal (fully isolated CSS)
   ✅ Saves courier/tracking data via PUT /api/orders/:id
   ✅ Triggers automated emails via the backend
   ✅ Shows shipping info inside the order drawer
   ✅ Adds all new status values to dropdowns
   ✅ Toast notifications for success/error
   ✅ Does NOT break any existing admin functionality
   ✅ Uses .snv- prefixed classes to avoid ALL CSS conflicts
   ================================================================ */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────────── */
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
     Uses fully isolated .snv-ship-modal__ classes to prevent
     any conflicts with existing admin.css global styles.
  ════════════════════════════════════════════════════════════ */
  function injectShippingModal() {
    if (document.getElementById('shipping-modal')) return;

    const html = `
      <div id="shipping-modal" class="snv-ship-modal" role="dialog" aria-modal="true" aria-labelledby="snv-sm-title">

        <!-- Backdrop -->
        <div class="snv-ship-modal__overlay" id="snv-sm-overlay"></div>

        <!-- Dialog box -->
        <div class="snv-ship-modal__box">

          <!-- ── Header ── -->
          <div class="snv-ship-modal__header">
            <div class="snv-ship-modal__header-left">
              <div class="snv-ship-modal__icon">✈️</div>
              <div class="snv-ship-modal__title-wrap">
                <div class="snv-ship-modal__title" id="snv-sm-title">Mark as Shipped</div>
                <div class="snv-ship-modal__subtitle">Enter courier &amp; tracking details</div>
              </div>
            </div>
            <button class="snv-ship-modal__close" id="snv-sm-close" aria-label="Close">✕</button>
          </div>

          <!-- ── Order strip ── -->
          <div class="snv-ship-modal__strip-wrap">
            <div class="snv-ship-modal__strip">
              <div class="snv-ship-modal__strip-col">
                <div class="snv-ship-modal__strip-label">Order</div>
                <div class="snv-ship-modal__strip-value" id="snv-sm-order-id">—</div>
              </div>
              <div class="snv-ship-modal__strip-col--right">
                <div class="snv-ship-modal__strip-label">Customer</div>
                <div class="snv-ship-modal__strip-value" id="snv-sm-customer">—</div>
              </div>
            </div>
          </div>

          <!-- ── Body ── -->
          <div class="snv-ship-modal__body">

            <!-- Courier Partner -->
            <div class="snv-sfield">
              <label class="snv-sfield__label" for="snv-sm-courier">
                Courier Partner <span class="snv-sfield__required">*</span>
              </label>
              <input
                id="snv-sm-courier"
                class="snv-sfield__input"
                type="text"
                placeholder="e.g. Delhivery, DTDC, Blue Dart, Ekart…"
                autocomplete="off"
              >
            </div>

            <!-- Tracking ID -->
            <div class="snv-sfield">
              <label class="snv-sfield__label" for="snv-sm-tracking-id">
                Tracking ID / AWB Number <span class="snv-sfield__required">*</span>
              </label>
              <input
                id="snv-sm-tracking-id"
                class="snv-sfield__input"
                type="text"
                placeholder="e.g. DEL123456789IN"
                autocomplete="off"
                style="letter-spacing:0.05em"
              >
            </div>

            <!-- Tracking URL + Est. Delivery Date (2-col) -->
            <div class="snv-srow2">
              <div class="snv-sfield">
                <label class="snv-sfield__label" for="snv-sm-tracking-url">
                  Tracking URL <span class="snv-optional">Optional</span>
                </label>
                <input
                  id="snv-sm-tracking-url"
                  class="snv-sfield__input"
                  type="url"
                  placeholder="https://track.courier.com/…"
                >
              </div>
              <div class="snv-sfield">
                <label class="snv-sfield__label" for="snv-sm-est-date">
                  Est. Delivery Date <span class="snv-optional">Optional</span>
                </label>
                <input
                  id="snv-sm-est-date"
                  class="snv-sfield__input"
                  type="date"
                >
              </div>
            </div>

            <!-- Email note -->
            <div class="snv-ship-modal__note">
              <span class="snv-ship-modal__note-icon">📧</span>
              <span class="snv-ship-modal__note-text">
                A <strong>premium shipping confirmation email</strong> will be automatically sent to the customer with all tracking details.
              </span>
            </div>

          </div><!-- /body -->

          <div class="snv-ship-modal__divider"></div>

          <!-- ── Footer ── -->
          <div class="snv-ship-modal__footer">
            <button class="snv-ship-modal__btn-cancel" id="snv-sm-btn-cancel">Cancel</button>
            <button class="snv-ship-modal__btn-confirm" id="snv-sm-btn-confirm">
              <div class="snv-btn-spinner"></div>
              <span class="snv-btn-label">Confirm Shipment</span>
            </button>
          </div>

        </div><!-- /box -->
      </div><!-- /modal -->
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('snv-sm-overlay').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-close').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-btn-cancel').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-btn-confirm').addEventListener('click', confirmShipment);
  }

  /* ── Modal state ─────────────────────────────────────────── */
  let _pendingOrderId   = null;
  let _pendingOrderData = null;
  let _pendingSelect    = null;

  function openShippingModal(orderId, orderData, selectEl) {
    injectShippingModal();
    _pendingOrderId   = orderId;
    _pendingOrderData = orderData;
    _pendingSelect    = selectEl;

    document.getElementById('snv-sm-order-id').textContent = '#' + String(orderId).slice(-6).toUpperCase();
    document.getElementById('snv-sm-customer').textContent = orderData?.shipping?.fullName || 'Customer';

    // Clear fields & errors
    ['snv-sm-courier', 'snv-sm-tracking-id', 'snv-sm-tracking-url', 'snv-sm-est-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('error'); }
    });

    // Min date = today
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('snv-sm-est-date');
    if (dateEl) dateEl.min = today;

    const modal = document.getElementById('shipping-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('snv-sm-courier')?.focus(), 360);
  }

  function closeShippingModal() {
    const modal = document.getElementById('shipping-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';

    if (_pendingSelect) {
      _pendingSelect.value = _pendingSelect.dataset.prevValue || 'pending';
    }

    _pendingOrderId   = null;
    _pendingOrderData = null;
    _pendingSelect    = null;
  }

  /* ── Confirm shipment ─────────────────────────────────────── */
  async function confirmShipment() {
    const courierEl   = document.getElementById('snv-sm-courier');
    const trackingEl  = document.getElementById('snv-sm-tracking-id');
    const urlEl       = document.getElementById('snv-sm-tracking-url');
    const estDateEl   = document.getElementById('snv-sm-est-date');

    const courierName   = courierEl.value.trim();
    const trackingId    = trackingEl.value.trim();
    const trackingUrl   = urlEl.value.trim();
    const estimatedDate = estDateEl.value
      ? new Date(estDateEl.value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // Validate
    let valid = true;
    [courierEl, trackingEl].forEach(el => {
      el.classList.remove('error');
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
    });
    if (!valid) { showToast('Please fill in Courier Name and Tracking ID', 'error'); return; }

    const btn = document.getElementById('snv-sm-btn-confirm');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const res = await fetch(`${getAPI()}/orders/${_pendingOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'shipped', courierName, trackingId, trackingUrl, estimatedDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }

      await res.json();

      const modal = document.getElementById('shipping-modal');
      modal.classList.remove('active');
      document.body.style.overflow = '';

      if (_pendingSelect) {
        _pendingSelect.dataset.prevValue = 'shipped';
        _pendingSelect.value = 'shipped';
      }

      showToast('✈️  Order marked as Shipped — confirmation email sent!', 'success');
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
  ════════════════════════════════════════════════════════════ */
  window._originalUpdOrder = window.updOrder;

  window.updOrder = async function (id, status, orderData, selectEl) {
    if (selectEl) selectEl.dataset.prevValue = selectEl.dataset.currentValue || status;

    if (status === 'shipped') {
      openShippingModal(id, orderData, selectEl);
      return;
    }

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
    if (typeof window._originalOpenDrawer === 'function') {
      window._originalOpenDrawer(o);
    }

    setTimeout(() => {
      const drawerBody = document.querySelector('#drawer-body');
      if (!drawerBody) return;

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
          if (controlCard) {
            drawerBody.insertBefore(shipCard, controlCard);
          } else {
            drawerBody.appendChild(shipCard);
          }
        }
      }
    }, 60);
  };

  /* ── Keyboard: ESC closes modal ──────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('shipping-modal');
      if (modal && modal.classList.contains('active')) closeShippingModal();
    }
  });

  console.log('✅ [SHENOVA Shipping v2] admin.shipping.js loaded — isolated CSS classes active');

})();