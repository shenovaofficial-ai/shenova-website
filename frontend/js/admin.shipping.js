/* ================================================================
   admin.shipping.js — SHENOVA Shipping Management v3
   ================================================================
   THE FIX: Injects a high-specificity <style> block that beats
   dashboard.html's global  input,textarea,select { ... }  rule.
   Uses [data-snv] attribute selector (specificity 0,1,0,1) which
   wins over the bare element selector (0,0,0,1) in the HTML.
   All modal markup uses data-snv on every input/select so the
   scoped rules always win — no !important arms race needed.
   ================================================================ */

(function () {
  'use strict';

  const getAPI = () => (typeof API !== 'undefined' ? API : (typeof window.API !== 'undefined' ? window.API : ''));

  /* ════════════════════════════════════════════════════════════
     INJECT ISOLATED STYLE BLOCK — beats global input/select/button
     rules from dashboard.html's inline <style> by using attribute
     selector specificity [data-snv] on every targeted element.
  ════════════════════════════════════════════════════════════ */
  function injectModalStyles() {
    if (document.getElementById('snv-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'snv-modal-styles';
    style.textContent = `
      /* ── Overlay ── */
      #shipping-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transition: opacity .35s cubic-bezier(.22,1,.36,1), visibility .35s !important;
        font-family: "DM Sans","Helvetica Neue",Arial,sans-serif !important;
      }
      #shipping-modal.active {
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* ── Backdrop ── */
      #snv-sm-overlay {
        position: absolute !important;
        inset: 0 !important;
        background: rgba(8,7,5,.78) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        cursor: pointer !important;
        z-index: 0 !important;
      }

      /* ── Dialog box ── */
      .snv-modal-box {
        position: relative !important;
        z-index: 1 !important;
        background: #fff !important;
        border-radius: 28px !important;
        width: min(540px, 92vw) !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        box-shadow: 0 0 0 1px rgba(12,11,9,.06), 0 8px 24px rgba(12,11,9,.1), 0 40px 90px rgba(12,11,9,.24) !important;
        transform: translateY(30px) scale(.96) !important;
        transition: transform .42s cubic-bezier(.34,1.4,.64,1) !important;
        scrollbar-width: thin !important;
        scrollbar-color: #e8e4de transparent !important;
      }
      #shipping-modal.active .snv-modal-box {
        transform: translateY(0) scale(1) !important;
      }

      /* ── Header ── */
      .snv-modal-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 26px 28px 20px !important;
        border-bottom: 1px solid #f0ece6 !important;
        box-sizing: border-box !important;
      }
      .snv-modal-header-left {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
      }
      .snv-modal-icon {
        width: 48px !important; height: 48px !important; min-width: 48px !important;
        background: linear-gradient(145deg,#0c0b09,#2a2620) !important;
        border-radius: 14px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        font-size: 22px !important;
        box-shadow: 0 4px 12px rgba(12,11,9,.25) !important;
      }
      .snv-modal-title {
        font-family: "Cormorant Garamond",Georgia,serif !important;
        font-size: 25px !important; font-weight: 600 !important;
        color: #0c0b09 !important; line-height: 1.15 !important;
        display: block !important;
        margin: 0 !important; padding: 0 !important;
        border: none !important; background: none !important;
      }
      .snv-modal-subtitle {
        font-size: 10px !important; color: #a8a09a !important;
        letter-spacing: .22em !important; text-transform: uppercase !important;
        margin-top: 4px !important; display: block !important;
        font-family: "DM Sans",sans-serif !important;
        border: none !important; background: none !important;
        margin-bottom: 0 !important; padding: 0 !important;
      }

      /* ── Close button — reset every global button rule ── */
      button.snv-modal-close[data-snv] {
        all: unset !important;
        width: 36px !important; height: 36px !important; min-width: 36px !important;
        border-radius: 50% !important;
        border: 1px solid #ede8e0 !important;
        background: #faf8f5 !important;
        cursor: pointer !important;
        font-size: 16px !important; color: #7a746e !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: background .2s, color .2s, transform .2s !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
      }
      button.snv-modal-close[data-snv]:hover {
        background: #0c0b09 !important; color: #fff !important;
        border-color: #0c0b09 !important; transform: rotate(90deg) !important;
      }

      /* ── Order strip ── */
      .snv-modal-strip-wrap {
        padding: 14px 28px 0 !important; box-sizing: border-box !important;
      }
      .snv-modal-strip {
        display: flex !important; align-items: center !important;
        justify-content: space-between !important;
        background: linear-gradient(135deg,#faf7f2,#f5f0e8) !important;
        border: 1px solid #ece6db !important; border-radius: 14px !important;
        padding: 12px 16px !important; box-sizing: border-box !important;
      }
      .snv-modal-strip-label {
        font-size: 9px !important; letter-spacing: .22em !important;
        text-transform: uppercase !important; color: #c0b8ae !important;
        margin-bottom: 3px !important; display: block !important;
        font-family: "DM Sans",sans-serif !important;
        border: none !important; background: none !important; padding: 0 !important;
      }
      .snv-modal-strip-value {
        font-family: "Cormorant Garamond",Georgia,serif !important;
        font-size: 18px !important; font-weight: 600 !important;
        color: #0c0b09 !important; line-height: 1.1 !important;
        display: block !important;
        border: none !important; background: none !important; padding: 0 !important;
        margin: 0 !important;
      }

      /* ── Body ── */
      .snv-modal-body {
        display: flex !important; flex-direction: column !important;
        gap: 15px !important; padding: 20px 28px !important;
        box-sizing: border-box !important;
      }

      /* ── Field group ── */
      .snv-field-group {
        display: flex !important; flex-direction: column !important;
        gap: 7px !important; box-sizing: border-box !important; width: 100% !important;
      }
      .snv-field-label {
        font-size: 9.5px !important; letter-spacing: .22em !important;
        text-transform: uppercase !important; color: #8a8279 !important;
        font-weight: 700 !important; display: block !important;
        font-family: "DM Sans",sans-serif !important;
        border: none !important; background: none !important; padding: 0 !important; margin: 0 !important;
      }
      .snv-field-req { color: #c4a76a !important; margin-left: 3px !important; }
      .snv-field-opt {
        display: inline-block !important; font-size: 8px !important;
        letter-spacing: .14em !important; text-transform: uppercase !important;
        color: #c4a76a !important; background: #fdf6ea !important;
        border: 1px solid #e8d4aa !important; padding: 1px 7px !important;
        border-radius: 999px !important; margin-left: 6px !important;
        vertical-align: middle !important; font-family: "DM Sans",sans-serif !important;
      }

      /* ── THE KEY FIX: [data-snv] attribute selector beats bare "input" ── */
      input[data-snv], select[data-snv] {
        display: block !important;
        width: 100% !important;
        padding: 12px 16px !important;
        border: 1.5px solid #e8e4dd !important;
        border-radius: 12px !important;
        font-family: "DM Sans","Helvetica Neue",Arial,sans-serif !important;
        font-size: 14px !important;
        font-weight: 400 !important;
        color: #0c0b09 !important;
        background: #fafaf8 !important;
        background-image: none !important;
        box-sizing: border-box !important;
        line-height: 1.4 !important;
        margin: 0 !important;
        outline: none !important;
        transition: border-color .22s, box-shadow .22s, background .22s !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        height: auto !important;
        min-height: unset !important;
        max-height: unset !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        border-right-width: 1.5px !important;
        border-bottom-width: 1.5px !important;
      }
      input[data-snv]::placeholder { color: #c0b8ae !important; font-size: 13px !important; }
      input[data-snv]:focus, select[data-snv]:focus {
        border-color: #0c0b09 !important;
        box-shadow: 0 0 0 3.5px rgba(12,11,9,.07) !important;
        background: #fff !important;
        background-image: none !important;
      }
      input[data-snv].snv-error {
        border-color: #c0392b !important;
        box-shadow: 0 0 0 3px rgba(192,57,43,.1) !important;
      }
      input[data-snv][type="date"]::-webkit-calendar-picker-indicator { opacity: .35; cursor: pointer; }

      /* ── 2-col row ── */
      .snv-2col {
        display: grid !important; grid-template-columns: 1fr 1fr !important;
        gap: 13px !important; width: 100% !important; box-sizing: border-box !important;
      }

      /* ── Note box ── */
      .snv-note-box {
        display: flex !important; align-items: flex-start !important; gap: 11px !important;
        background: linear-gradient(135deg,#faf7f2,#f5f0e8) !important;
        border: 1px solid #ece6db !important; border-radius: 12px !important;
        padding: 13px 15px !important; box-sizing: border-box !important; width: 100% !important;
      }
      .snv-note-icon { font-size: 16px !important; flex-shrink: 0 !important; margin-top: 1px !important; }
      .snv-note-text {
        font-size: 11.5px !important; color: #8a8279 !important; line-height: 1.6 !important;
        font-family: "DM Sans",sans-serif !important;
        margin: 0 !important; padding: 0 !important;
      }
      .snv-note-text strong { font-weight: 600 !important; color: #0c0b09 !important; }

      /* ── Divider ── */
      .snv-modal-divider {
        display: block !important; height: 1px !important;
        background: #f0ece6 !important; width: 100% !important;
      }

      /* ── Footer ── */
      .snv-modal-footer {
        display: flex !important; gap: 11px !important;
        padding: 16px 28px 26px !important;
        box-sizing: border-box !important; width: 100% !important;
      }

      /* ── Cancel button — [data-snv] beats global button ── */
      button[data-snv].snv-btn-cancel {
        all: unset !important;
        flex: 1 !important; display: flex !important;
        align-items: center !important; justify-content: center !important;
        padding: 13px 18px !important;
        border: 1.5px solid #ddd8d0 !important; border-radius: 999px !important;
        background: transparent !important; color: #6a6460 !important;
        font-family: "DM Sans",sans-serif !important;
        font-size: 10.5px !important; font-weight: 700 !important;
        letter-spacing: .2em !important; text-transform: uppercase !important;
        cursor: pointer !important; min-height: 46px !important;
        box-sizing: border-box !important;
        transition: border-color .2s, color .2s, background .2s !important;
      }
      button[data-snv].snv-btn-cancel:hover {
        border-color: #0c0b09 !important; color: #0c0b09 !important;
        background: #faf8f5 !important;
      }

      /* ── Confirm button ── */
      button[data-snv].snv-btn-confirm {
        all: unset !important;
        flex: 2 !important; display: flex !important;
        align-items: center !important; justify-content: center !important;
        gap: 9px !important; padding: 13px 22px !important;
        border: none !important; border-radius: 999px !important;
        background: linear-gradient(145deg,#0c0b09,#2a2620) !important;
        color: #fff !important; font-family: "DM Sans",sans-serif !important;
        font-size: 10.5px !important; font-weight: 700 !important;
        letter-spacing: .2em !important; text-transform: uppercase !important;
        cursor: pointer !important; min-height: 46px !important;
        box-shadow: 0 4px 16px rgba(12,11,9,.22) !important;
        box-sizing: border-box !important;
        transition: background .22s, transform .18s, box-shadow .22s !important;
      }
      button[data-snv].snv-btn-confirm:hover {
        background: linear-gradient(145deg,#1a1814,#3a342e) !important;
        transform: translateY(-1.5px) !important;
        box-shadow: 0 8px 24px rgba(12,11,9,.28) !important;
      }
      button[data-snv].snv-btn-confirm:active {
        transform: translateY(0) !important;
        box-shadow: 0 3px 10px rgba(12,11,9,.18) !important;
      }
      button[data-snv].snv-btn-confirm:disabled {
        background: linear-gradient(145deg,#c4bfb8,#b0aba4) !important;
        cursor: not-allowed !important; transform: none !important; box-shadow: none !important;
      }

      /* ── Spinner ── */
      .snv-spinner {
        display: none !important;
        width: 15px !important; height: 15px !important; min-width: 15px !important;
        border: 2px solid rgba(255,255,255,.28) !important;
        border-top-color: #fff !important; border-radius: 50% !important;
        animation: snv-spin .7s linear infinite !important;
        box-sizing: border-box !important;
      }
      button[data-snv].snv-btn-confirm.loading .snv-spinner { display: block !important; }
      button[data-snv].snv-btn-confirm.loading .snv-btn-text { display: none !important; }
      @keyframes snv-spin { to { transform: rotate(360deg); } }

      /* ── Mobile: bottom sheet ── */
      @media (max-width: 600px) {
        #shipping-modal { align-items: flex-end !important; }
        .snv-modal-box {
          border-radius: 24px 24px 0 0 !important;
          width: 100% !important; max-width: 100% !important;
          max-height: 90vh !important; transform: translateY(100%) !important;
        }
        #shipping-modal.active .snv-modal-box { transform: translateY(0) !important; }
        .snv-2col { grid-template-columns: 1fr !important; }
        .snv-modal-header, .snv-modal-body, .snv-modal-footer, .snv-modal-strip-wrap {
          padding-left: 20px !important; padding-right: 20px !important;
        }
        .snv-modal-footer { flex-direction: column-reverse !important; padding-bottom: 28px !important; }
        button[data-snv].snv-btn-cancel, button[data-snv].snv-btn-confirm {
          flex: unset !important; width: 100% !important;
        }
      }

      /* ── Drawer: status select ── */
      .status-select-wrap { position: relative; }
      .status-select-wrap select {
        width: 100%; padding: 14px 18px;
        border: 1.5px solid #e8e4de; border-radius: 14px;
        font-family: inherit; font-size: 14px; appearance: none; -webkit-appearance: none;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 16px center, #fafaf9;
        cursor: pointer; transition: border-color .2s;
      }
      .status-select-wrap select:focus { border-color: #0a0a0a; outline: none; }

      /* ── Drawer: shipping info card ── */
      .shipping-info-card {
        background: #faf8f5; border: 1px solid #ede8e0;
        border-radius: 18px; padding: 22px;
      }
      .shipping-info-card h4 {
        font-family: "Cormorant Garamond",serif; font-size: 24px;
        font-weight: 600; color: #111; margin-bottom: 16px;
      }
      .shipping-info-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 0; border-bottom: 1px solid #ede8e0; gap: 12px;
      }
      .shipping-info-row:last-child { border-bottom: none; }
      .shipping-info-row .sir-label {
        font-size: 11px; letter-spacing: .15em; text-transform: uppercase; color: #aaa; flex-shrink: 0;
      }
      .shipping-info-row .sir-value {
        font-size: 14px; color: #111; font-weight: 600; text-align: right; word-break: break-all;
      }
      .track-link-btn {
        display: inline-flex; align-items: center; gap: 6px;
        background: #111; color: #fff; text-decoration: none;
        padding: 10px 18px; border-radius: 999px; font-size: 11px;
        font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
        margin-top: 14px; transition: background .2s;
      }
      .track-link-btn:hover { background: #333; }

      /* ── Badge: out_for_delivery ── */
      .badge.out_for_delivery, .out_for_delivery { background: #e8f5e9 !important; color: #2e7d32 !important; }

      /* ── Toast ── */
      .shenova-toast {
        position: fixed; bottom: 28px; right: 28px; z-index: 9999999;
        display: flex; align-items: center; gap: 12px;
        background: #0c0b09; color: #fff; padding: 14px 22px;
        border-radius: 14px; font-family: "DM Sans",sans-serif;
        font-size: 13px; font-weight: 500;
        box-shadow: 0 12px 40px rgba(12,11,9,.24);
        transform: translateY(80px); opacity: 0;
        transition: transform .4s cubic-bezier(.34,1.4,.64,1), opacity .3s;
        pointer-events: none; max-width: 360px;
      }
      .shenova-toast.show { transform: translateY(0); opacity: 1; }
      .shenova-toast.success { background: #0c0b09; border-left: 3px solid #c4a76a; }
      .shenova-toast.error   { background: #180404; border-left: 3px solid #c0392b; }
      @media (max-width: 600px) {
        .shenova-toast { bottom: 16px; right: 16px; left: 16px; max-width: unset; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ════════════════════════════════════════════════════════════
     TOAST
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
     INJECT MODAL HTML
     Every input/select/button gets data-snv="" so the scoped
     CSS rules beat the global bare-element selectors.
  ════════════════════════════════════════════════════════════ */
  function injectShippingModal() {
    if (document.getElementById('shipping-modal')) return;
    injectModalStyles();

    document.body.insertAdjacentHTML('beforeend', `
      <div id="shipping-modal" role="dialog" aria-modal="true" aria-labelledby="snv-title">
        <div id="snv-sm-overlay"></div>

        <div class="snv-modal-box">

          <!-- Header -->
          <div class="snv-modal-header">
            <div class="snv-modal-header-left">
              <div class="snv-modal-icon">✈️</div>
              <div>
                <span class="snv-modal-title" id="snv-title">Mark as Shipped</span>
                <span class="snv-modal-subtitle">Enter courier &amp; tracking details</span>
              </div>
            </div>
            <button class="snv-modal-close" data-snv id="snv-sm-close" aria-label="Close">✕</button>
          </div>

          <!-- Order strip -->
          <div class="snv-modal-strip-wrap">
            <div class="snv-modal-strip">
              <div>
                <span class="snv-modal-strip-label">Order</span>
                <span class="snv-modal-strip-value" id="snv-sm-order-id">—</span>
              </div>
              <div style="text-align:right">
                <span class="snv-modal-strip-label">Customer</span>
                <span class="snv-modal-strip-value" id="snv-sm-customer">—</span>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="snv-modal-body">

            <div class="snv-field-group">
              <label class="snv-field-label" for="snv-sm-courier">
                Courier Partner <span class="snv-field-req">*</span>
              </label>
              <input data-snv id="snv-sm-courier" type="text"
                placeholder="e.g. Delhivery, DTDC, Blue Dart, Ekart…" autocomplete="off">
            </div>

            <div class="snv-field-group">
              <label class="snv-field-label" for="snv-sm-tracking">
                Tracking ID / AWB Number <span class="snv-field-req">*</span>
              </label>
              <input data-snv id="snv-sm-tracking" type="text"
                placeholder="e.g. DEL123456789IN" autocomplete="off" style="letter-spacing:.06em">
            </div>

            <div class="snv-2col">
              <div class="snv-field-group">
                <label class="snv-field-label" for="snv-sm-url">
                  Tracking URL <span class="snv-field-opt">Optional</span>
                </label>
                <input data-snv id="snv-sm-url" type="url" placeholder="https://track.courier.com/…">
              </div>
              <div class="snv-field-group">
                <label class="snv-field-label" for="snv-sm-date">
                  Est. Delivery Date <span class="snv-field-opt">Optional</span>
                </label>
                <input data-snv id="snv-sm-date" type="date">
              </div>
            </div>

            <div class="snv-note-box">
              <span class="snv-note-icon">📧</span>
              <p class="snv-note-text">
                A <strong>premium shipping confirmation email</strong> will be automatically
                sent to the customer with all tracking details.
              </p>
            </div>

          </div>

          <div class="snv-modal-divider"></div>

          <!-- Footer -->
          <div class="snv-modal-footer">
            <button data-snv class="snv-btn-cancel" id="snv-sm-cancel">Cancel</button>
            <button data-snv class="snv-btn-confirm" id="snv-sm-confirm">
              <span class="snv-spinner"></span>
              <span class="snv-btn-text">Confirm Shipment</span>
            </button>
          </div>

        </div>
      </div>
    `);

    document.getElementById('snv-sm-overlay').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-close').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-cancel').addEventListener('click', closeShippingModal);
    document.getElementById('snv-sm-confirm').addEventListener('click', confirmShipment);
  }

  /* ── Modal state ─────────────────────────────────────────── */
  let _orderId = null, _orderData = null, _select = null;

  function openShippingModal(orderId, orderData, selectEl) {
    injectShippingModal();
    _orderId = orderId; _orderData = orderData; _select = selectEl;

    document.getElementById('snv-sm-order-id').textContent = '#' + String(orderId).slice(-6).toUpperCase();
    document.getElementById('snv-sm-customer').textContent = orderData?.shipping?.fullName || 'Customer';

    ['snv-sm-courier','snv-sm-tracking','snv-sm-url','snv-sm-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('snv-error'); }
    });

    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('snv-sm-date');
    if (dateEl) dateEl.min = today;

    document.getElementById('shipping-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('snv-sm-courier')?.focus(), 380);
  }

  function closeShippingModal() {
    const modal = document.getElementById('shipping-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (_select) _select.value = _select.dataset.prevValue || 'pending';
    _orderId = null; _orderData = null; _select = null;
  }

  /* ── Confirm shipment ─────────────────────────────────────── */
  async function confirmShipment() {
    const courierEl  = document.getElementById('snv-sm-courier');
    const trackingEl = document.getElementById('snv-sm-tracking');
    const urlEl      = document.getElementById('snv-sm-url');
    const dateEl     = document.getElementById('snv-sm-date');

    const courierName   = courierEl.value.trim();
    const trackingId    = trackingEl.value.trim();
    const trackingUrl   = urlEl.value.trim();
    const estimatedDate = dateEl.value
      ? new Date(dateEl.value).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
      : '';

    let valid = true;
    [courierEl, trackingEl].forEach(el => {
      el.classList.remove('snv-error');
      if (!el.value.trim()) { el.classList.add('snv-error'); valid = false; }
    });
    if (!valid) { showToast('Please fill in Courier Name and Tracking ID', 'error'); return; }

    const btn = document.getElementById('snv-sm-confirm');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const res = await fetch(`${getAPI()}/orders/${_orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status:'shipped', courierName, trackingId, trackingUrl, estimatedDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }
      await res.json();

      document.getElementById('shipping-modal').classList.remove('active');
      document.body.style.overflow = '';
      if (_select) { _select.dataset.prevValue = 'shipped'; _select.value = 'shipped'; }
      showToast('✈️  Order marked as Shipped — confirmation email sent!', 'success');
      if (typeof loadDash === 'function') loadDash();
      _orderId = null; _orderData = null; _select = null;

    } catch (err) {
      console.error('[ShippingModal]', err);
      showToast('❌ ' + (err.message || 'Failed to update order'), 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  /* ════════════════════════════════════════════════════════════
     OVERRIDE updOrder
  ════════════════════════════════════════════════════════════ */
  window._originalUpdOrder = window.updOrder;
  window.updOrder = async function (id, status, orderData, selectEl) {
    if (selectEl) selectEl.dataset.prevValue = selectEl.dataset.currentValue || status;
    if (status === 'shipped') { openShippingModal(id, orderData, selectEl); return; }

    try {
      const res = await fetch(`${getAPI()}/orders/${id}`, {
        method: 'PUT', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      const msgs = {
        out_for_delivery:'🚚 Order marked as Out For Delivery — customer notified!',
        delivered:'❤️  Order marked as Delivered — customer notified!',
        cancelled:'❌ Order cancelled — customer notified.',
        processing:'⚙️  Order status updated to Processing.',
        pending:'🔄 Order status updated to Pending.',
      };
      showToast(msgs[status] || `Status updated to ${status}`, 'success');
      if (selectEl) selectEl.dataset.currentValue = status;
      if (typeof loadDash === 'function') loadDash();
    } catch (err) {
      showToast('❌ Failed to update order status', 'error');
      if (selectEl) selectEl.value = selectEl.dataset.prevValue || 'pending';
    }
  };

  /* ════════════════════════════════════════════════════════════
     OVERRIDE openDrawer
  ════════════════════════════════════════════════════════════ */
  window._originalOpenDrawer = window.openDrawer;
  window.openDrawer = function (o) {
    if (typeof window._originalOpenDrawer === 'function') window._originalOpenDrawer(o);
    setTimeout(() => {
      const drawerBody = document.querySelector('#drawer-body');
      if (!drawerBody) return;

      const cards = drawerBody.querySelectorAll('.info-card');
      let controlCard = null;
      cards.forEach(c => {
        if (c.querySelector('h4')?.textContent.includes('Order Controls')) controlCard = c;
      });

      if (controlCard) {
        controlCard.innerHTML = `
          <h4>Order Controls</h4>
          <div class="status-select-wrap">
            <select id="drawer-status-select"
              data-current-value="${o.status}" data-prev-value="${o.status}"
              onchange="window.updOrder('${o._id}',this.value,${JSON.stringify(o).replace(/"/g,'&quot;')},this)">
              ${['pending','processing','shipped','out_for_delivery','delivered','cancelled'].map(s =>
                `<option value="${s}" ${o.status===s?'selected':''}>${s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`
              ).join('')}
            </select>
          </div>`;
      }

      if (o.shippingInfo && (o.shippingInfo.courierName || o.shippingInfo.trackingId)) {
        const si = o.shippingInfo;
        if (!drawerBody.querySelector('#ship-info-card')) {
          const shipCard = document.createElement('div');
          shipCard.id = 'ship-info-card';
          shipCard.className = 'info-card shipping-info-card';
          shipCard.innerHTML = `
            <h4>Shipping Details</h4>
            ${si.courierName  ? `<div class="shipping-info-row"><span class="sir-label">Courier</span><span class="sir-value">${si.courierName}</span></div>`:''}
            ${si.trackingId   ? `<div class="shipping-info-row"><span class="sir-label">Tracking ID</span><span class="sir-value" style="font-family:monospace;letter-spacing:.05em">${si.trackingId}</span></div>`:''}
            ${si.estimatedDate? `<div class="shipping-info-row"><span class="sir-label">Est. Delivery</span><span class="sir-value" style="color:#27a35a">${si.estimatedDate}</span></div>`:''}
            ${si.shippedAt    ? `<div class="shipping-info-row"><span class="sir-label">Shipped On</span><span class="sir-value">${new Date(si.shippedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>`:''}
            ${si.deliveredAt  ? `<div class="shipping-info-row"><span class="sir-label">Delivered On</span><span class="sir-value" style="color:#27a35a">${new Date(si.deliveredAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>`:''}
            ${si.trackingUrl  ? `<a href="${si.trackingUrl}" target="_blank" rel="noopener" class="track-link-btn">🔗 Track on Courier Site</a>`:''}
          `;
          if (controlCard) drawerBody.insertBefore(shipCard, controlCard);
          else drawerBody.appendChild(shipCard);
        }
      }
    }, 60);
  };

  /* ── ESC key ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('shipping-modal');
      if (modal?.classList.contains('active')) closeShippingModal();
    }
  });

  console.log('✅ [SHENOVA Shipping v3] Loaded — attribute-selector CSS isolation active');
})();