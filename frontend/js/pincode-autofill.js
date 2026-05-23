/* ================================================================
   pincode-autofill.js — SHENOVA Luxury Checkout
   ================================================================
   PIN Code based State / City / Area autofill for Indian addresses.

   Features:
   - Auto-fetch on 6-digit PIN entry (debounced, no redundant calls)
   - Fills: State, City/District, Area (Post Office)
   - Delivery availability badge + estimated date
   - COD availability check
   - Graceful error handling + loading states
   - Zero impact on existing checkout logic / design

   Integrates with:
   - #f-zip   → PIN code input (already exists)
   - #f-city  → City input     (already exists)
   - #f-state → State input    (already exists)
   ================================================================ */

(function () {
  'use strict';

  /* ── CONFIG ── */
  const PIN_API   = 'https://api.postalpincode.in/pincode/';
  const DEBOUNCE  = 500;    // ms after user stops typing
  const SHENOVA_CITY = 'Surat'; // used for estimated delivery calc

  /* ── DELIVERY RULES (PIN-prefix based heuristic) ──
     Tune these freely; no external API needed for COD/EDD.
     Format: [prefix_string, cod_available, delivery_days, region_label]
  ── */
  const DELIVERY_RULES = [
    ['400', true,  2, 'Mumbai Metro'],
    ['411', true,  2, 'Pune Metro'],
    ['110', true,  3, 'Delhi NCR'],
    ['560', true,  3, 'Bangalore Metro'],
    ['600', true,  3, 'Chennai Metro'],
    ['700', true,  3, 'Kolkata Metro'],
    ['380', true,  1, 'Ahmedabad'],
    ['395', true,  1, 'Surat'],
    ['396', true,  1, 'South Gujarat'],
    ['360', true,  2, 'Rajkot / Saurashtra'],
    ['370', true,  3, 'Kutch'],
    ['302', true,  3, 'Jaipur'],
    ['226', true,  3, 'Lucknow'],
    ['500', true,  3, 'Hyderabad'],
    ['682', false, 5, 'Kochi'],
    ['695', false, 5, 'Thiruvananthapuram'],
    ['790', false, 7, 'Northeast India'],
    ['791', false, 7, 'Northeast India'],
    ['792', false, 7, 'Northeast India'],
    ['793', false, 7, 'Northeast India'],
    ['794', false, 7, 'Northeast India'],
    ['795', false, 7, 'Northeast India'],
    ['796', false, 7, 'Northeast India'],
    ['797', false, 7, 'Northeast India'],
  ];

  /* ── STATE: track last fetched PIN to avoid duplicate calls ── */
  let _lastFetchedPin = '';
  let _debounceTimer  = null;

  /* ── INJECT STYLES (scoped, minimal, matches luxury theme) ── */
  const CSS = `
    /* PIN Autofill UI — Shenova */
    #pin-status-wrap {
      margin-top: 10px;
      min-height: 0;
      transition: all 0.3s ease;
    }

    /* Inline loader spinner inside ZIP field */
    .co-field .pin-spinner {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 2px solid rgba(184,149,106,0.25);
      border-top-color: #b8956a;
      border-radius: 50%;
      animation: pin-spin 0.7s linear infinite;
      display: none;
      pointer-events: none;
    }
    .co-field.pin-loading .pin-spinner { display: block; }

    /* Field glow when autofilled */
    .co-input.pin-autofilled {
      color: #3d2e12 !important;
    }
    .co-input.pin-autofilled ~ .co-field-line {
      background: linear-gradient(90deg, #b8956a, #d4a96a) !important;
      transform: scaleX(1) !important;
    }

    /* Delivery Info Card */
    #pin-delivery-card {
      display: none;
      margin-top: 14px;
      border: 1.5px solid rgba(184,149,106,0.30);
      border-radius: 12px;
      background: rgba(184,149,106,0.05);
      padding: 16px 18px;
      font-family: var(--co-sans, 'DM Sans', sans-serif);
    }
    #pin-delivery-card.visible { display: block; }

    .pin-card-title {
      font-size: 9.5px;
      letter-spacing: .28em;
      text-transform: uppercase;
      color: #8a6a3a;
      font-weight: 500;
      margin-bottom: 13px;
    }

    .pin-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid rgba(184,149,106,0.12);
      font-size: 12.5px;
    }
    .pin-info-row:last-of-type { border-bottom: none; padding-bottom: 0; }
    .pin-lbl { color: #7a6a50; }
    .pin-val { font-weight: 500; color: #2a1f0e; }

    /* Area select pills */
    #pin-area-wrap {
      margin-top: 14px;
      display: none;
    }
    #pin-area-wrap.visible { display: block; }
    .pin-area-label {
      font-size: 9.5px;
      letter-spacing: .22em;
      text-transform: uppercase;
      color: #8a6a3a;
      margin-bottom: 8px;
      display: block;
    }
    .pin-area-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pin-area-pill {
      padding: 5px 13px;
      border: 1px solid rgba(184,149,106,0.35);
      border-radius: 50px;
      background: transparent;
      font: 400 11px/1 'DM Sans', sans-serif;
      color: #5a4a30;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      letter-spacing: .04em;
    }
    .pin-area-pill:hover,
    .pin-area-pill.active {
      background: #b8956a;
      border-color: #b8956a;
      color: #fff;
    }

    /* Status messages */
    .pin-msg {
      font: 300 11.5px/1.5 'DM Sans', sans-serif;
      margin-top: 8px;
      padding: 8px 13px;
      border-radius: 6px;
      display: none;
    }
    .pin-msg.visible { display: block; }
    .pin-msg.success {
      background: rgba(184,149,106,0.10);
      color: #7a5c28;
      border: 1px solid rgba(184,149,106,0.25);
    }
    .pin-msg.error {
      background: rgba(192,57,43,0.07);
      color: #b03020;
      border: 1px solid rgba(192,57,43,0.18);
    }
    .pin-msg.info {
      background: rgba(184,149,106,0.06);
      color: #7a6040;
      border: 1px solid rgba(184,149,106,0.18);
    }

    /* COD badge */
    .pin-cod-badge {
      display: inline-block;
      padding: 2px 9px;
      border-radius: 20px;
      font-size: 10px;
      letter-spacing: .1em;
      text-transform: uppercase;
      font-weight: 500;
    }
    .pin-cod-badge.yes {
      background: rgba(46,139,87,0.10);
      color: #1a7a48;
      border: 1px solid rgba(46,139,87,0.25);
    }
    .pin-cod-badge.no {
      background: rgba(192,57,43,0.09);
      color: #b03020;
      border: 1px solid rgba(192,57,43,0.20);
    }

    @keyframes pin-spin {
      to { transform: translateY(-50%) rotate(360deg); }
    }

    @media (max-width: 600px) {
      #pin-delivery-card { padding: 13px 14px; }
      .pin-area-pills { gap: 5px; }
      .pin-area-pill { font-size: 10.5px; padding: 5px 11px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── WAIT FOR DOM ── */
  function init() {
    const zipInput   = document.getElementById('f-zip');
    const cityInput  = document.getElementById('f-city');
    const stateInput = document.getElementById('f-state');

    if (!zipInput || !cityInput || !stateInput) return; // not on checkout page

    /* ── Inject spinner into ZIP field wrapper ── */
    const zipField = zipInput.closest('.co-field');
    if (zipField) {
      zipField.style.position = 'relative';
      const spinner = document.createElement('div');
      spinner.className = 'pin-spinner';
      zipField.appendChild(spinner);
    }

    /* ── Inject UI containers after the ZIP row ── */
    const zipRow = zipField?.closest('.co-field-row') || zipInput.closest('.co-field');
    const uiWrap = document.createElement('div');
    uiWrap.id = 'pin-status-wrap';
    uiWrap.innerHTML = `
      <div class="pin-msg" id="pin-msg"></div>
      <div id="pin-area-wrap">
        <span class="pin-area-label">✦ Select Area / Post Office</span>
        <div class="pin-area-pills" id="pin-area-pills"></div>
      </div>
      <div id="pin-delivery-card">
        <div class="pin-card-title">✦ Delivery Details for this PIN</div>
        <div class="pin-info-row">
          <span class="pin-lbl">Estimated Delivery</span>
          <span class="pin-val" id="pin-edd">—</span>
        </div>
        <div class="pin-info-row">
          <span class="pin-lbl">Cash on Delivery</span>
          <span class="pin-val" id="pin-cod-status">—</span>
        </div>
        <div class="pin-info-row">
          <span class="pin-lbl">Serviceable Region</span>
          <span class="pin-val" id="pin-region">—</span>
        </div>
      </div>
    `;

    if (zipRow) zipRow.insertAdjacentElement('afterend', uiWrap);

    /* ── Attach input listener ── */
    zipInput.addEventListener('input', function () {
      const pin = this.value.replace(/\D/g, '').slice(0, 6);
      this.value = pin; // strip non-digits

      clearTimeout(_debounceTimer);
      hidePinUI();

      if (pin.length === 6) {
        if (pin === _lastFetchedPin) return; // already fetched
        _debounceTimer = setTimeout(() => fetchPinData(pin), DEBOUNCE);
      }
    });

    /* ── Paste support ── */
    zipInput.addEventListener('paste', function () {
      setTimeout(() => { zipInput.dispatchEvent(new Event('input')); }, 10);
    });
  }

  /* ── FETCH & POPULATE ── */
  async function fetchPinData(pin) {
    const zipInput   = document.getElementById('f-zip');
    const zipField   = zipInput?.closest('.co-field');

    setLoading(true, zipField);
    showMsg('Fetching location details…', 'info');

    try {
      const res  = await fetch(PIN_API + pin);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      if (!data || !data[0] || data[0].Status === 'Error' || !data[0].PostOffice?.length) {
        showMsg('❌ Invalid PIN code. Please check and re-enter.', 'error');
        setLoading(false, zipField);
        return;
      }

      const postOffices = data[0].PostOffice;
      const first       = postOffices[0];
      const state       = first.State;
      const district    = first.District;

      /* Fill state & city */
      fillField('f-state', state);
      fillField('f-city', district);

      /* Area pills (if multiple post offices) */
      renderAreaPills(postOffices);

      /* Delivery card */
      renderDeliveryCard(pin);

      /* Success message */
      showMsg(`✦ Location found: ${district}, ${state}`, 'success');

      _lastFetchedPin = pin;

    } catch (err) {
      console.warn('[PIN Autofill] Error:', err);
      showMsg('⚠ Could not fetch location. Please fill in manually.', 'error');
    } finally {
      setLoading(false, zipField);
    }
  }

  /* ── FILL A FIELD & TRIGGER FLOATING LABEL ── */
  function fillField(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    el.value = value;
    el.classList.add('has-value', 'pin-autofilled');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ── AREA PILLS ── */
  function renderAreaPills(postOffices) {
    const wrap  = document.getElementById('pin-area-wrap');
    const pills = document.getElementById('pin-area-pills');
    if (!wrap || !pills) return;

    // Deduplicate by name
    const unique = [...new Map(postOffices.map(po => [po.Name, po])).values()];

    if (unique.length <= 1) { wrap.classList.remove('visible'); return; }

    pills.innerHTML = '';
    unique.slice(0, 12).forEach(po => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-area-pill';
      btn.textContent = po.Name;
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pin-area-pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        // Optionally write area into address field as hint
        const addrEl = document.getElementById('f-address');
        if (addrEl && !addrEl.value) {
          // Don't override — just set a placeholder-style suggestion
        }
      });
      pills.appendChild(btn);
    });

    wrap.classList.add('visible');
  }

  /* ── DELIVERY CARD ── */
  function renderDeliveryCard(pin) {
    const card    = document.getElementById('pin-delivery-card');
    const eddEl   = document.getElementById('pin-edd');
    const codEl   = document.getElementById('pin-cod-status');
    const regEl   = document.getElementById('pin-region');
    if (!card) return;

    // Match delivery rule
    const rule = DELIVERY_RULES.find(r => pin.startsWith(r[0]));
    const codAvail  = rule ? rule[1] : true;
    const days      = rule ? rule[2] : 5;
    const region    = rule ? rule[3] : 'India';

    // Estimated delivery date
    const today   = new Date();
    const edd     = new Date(today);
    edd.setDate(today.getDate() + days);
    const ddOpts  = { weekday: 'short', day: 'numeric', month: 'short' };
    const eddStr  = edd.toLocaleDateString('en-IN', ddOpts);

    eddEl.textContent  = days <= 2 ? `${eddStr} (${days}–${days + 1} days)` : `${eddStr} (${days}–${days + 2} days)`;
    regEl.textContent  = region;
    codEl.innerHTML = codAvail
      ? `<span class="pin-cod-badge yes">✓ Available</span>`
      : `<span class="pin-cod-badge no">✕ Not Available</span>`;

    card.classList.add('visible');
  }

  /* ── LOADING STATE ── */
  function setLoading(on, zipField) {
    if (zipField) zipField.classList.toggle('pin-loading', on);
  }

  /* ── MESSAGE ── */
  function showMsg(text, type) {
    const el = document.getElementById('pin-msg');
    if (!el) return;
    el.textContent = text;
    el.className = `pin-msg visible ${type}`;
  }

  /* ── HIDE ALL PIN UI ── */
  function hidePinUI() {
    const msg  = document.getElementById('pin-msg');
    const area = document.getElementById('pin-area-wrap');
    const card = document.getElementById('pin-delivery-card');
    if (msg)  { msg.className  = 'pin-msg'; }
    if (area) { area.classList.remove('visible'); }
    if (card) { card.classList.remove('visible'); }
    // Remove autofill highlights when user edits PIN
    ['f-city', 'f-state'].forEach(id => {
      document.getElementById(id)?.classList.remove('pin-autofilled');
    });
    _lastFetchedPin = '';
  }

  /* ── BOOT ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();