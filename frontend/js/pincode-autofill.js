/* ================================================================
   pincode-autofill.js — SHENOVA Luxury Checkout
   ================================================================
   PIN Code autofill with multi-source fallback:

   1st try  → api.postalpincode.in  (most data, sometimes CORS-blocked)
   2nd try  → nominatim.openstreetmap.org (always CORS-safe, less data)
   Fallback → clear error, let user type manually

   Fills: State · City/District · Area pills
   Also shows: EDD · COD badge · Region
   ================================================================ */

(function () {
  'use strict';

  /* ── CONFIG ── */
  const DEBOUNCE_MS = 600;

  /* ── DELIVERY RULES by PIN prefix ──
     [prefix, cod_available, delivery_days, region_label]        */
  const DELIVERY_RULES = [
    ['400', true, 2, 'Mumbai Metro'],
    ['411', true, 2, 'Pune Metro'],
    ['110', true, 3, 'Delhi NCR'],
    ['560', true, 3, 'Bangalore Metro'],
    ['600', true, 3, 'Chennai Metro'],
    ['700', true, 3, 'Kolkata Metro'],
    ['380', true, 1, 'Ahmedabad'],
    ['395', true, 1, 'Surat'],
    ['396', true, 1, 'South Gujarat'],
    ['360', true, 2, 'Rajkot / Saurashtra'],
    ['370', true, 3, 'Kutch'],
    ['302', true, 3, 'Jaipur'],
    ['226', true, 3, 'Lucknow'],
    ['500', true, 3, 'Hyderabad'],
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

  /* ── STATE ── */
  let _lastPin     = '';
  let _debounce    = null;

  /* ═══════════════════════════════════════════
     STYLES — scoped, luxury palette, no layout changes
  ═══════════════════════════════════════════ */
  const CSS = `
    /* Spinner inside ZIP field */
    .co-field .pin-spinner {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px; height: 15px;
      border: 2px solid rgba(184,149,106,.22);
      border-top-color: #b8956a;
      border-radius: 50%;
      animation: _pin_spin .75s linear infinite;
      display: none;
      pointer-events: none;
    }
    .co-field.pin-loading { position: relative; }
    .co-field.pin-loading .pin-spinner { display: block; }

    /* Gold underline on autofilled fields */
    .co-input.pin-filled { color: #2a1f0e !important; }
    .co-input.pin-filled ~ .co-field-line {
      background: linear-gradient(90deg,#b8956a,#d4a96a) !important;
      transform: scaleX(1) !important;
    }

    /* Status message */
    #pin-msg {
      display: none;
      margin-top: 9px;
      padding: 8px 14px;
      border-radius: 6px;
      font: 300 11.5px/1.55 'DM Sans', sans-serif;
      letter-spacing: .01em;
    }
    #pin-msg.visible    { display: block; }
    #pin-msg.pin-ok     { background:rgba(184,149,106,.10); color:#7a5c28; border:1px solid rgba(184,149,106,.28); }
    #pin-msg.pin-err    { background:rgba(192,57,43,.07);   color:#b03020; border:1px solid rgba(192,57,43,.18);  }
    #pin-msg.pin-info   { background:rgba(184,149,106,.06); color:#7a6040; border:1px solid rgba(184,149,106,.18);}

    /* Area pills */
    #pin-area-wrap { display:none; margin-top:14px; }
    #pin-area-wrap.visible { display:block; }
    .pin-area-label {
      display:block; margin-bottom:8px;
      font-size:9.5px; letter-spacing:.24em; text-transform:uppercase; color:#8a6a3a;
    }
    .pin-pills { display:flex; flex-wrap:wrap; gap:6px; }
    .pin-pill {
      padding:5px 13px; border-radius:50px; cursor:pointer;
      border:1px solid rgba(184,149,106,.35);
      background:transparent;
      font:400 11px/1 'DM Sans',sans-serif; color:#5a4a30;
      transition:background .2s, border-color .2s, color .2s;
      letter-spacing:.03em;
    }
    .pin-pill:hover, .pin-pill.active {
      background:#b8956a; border-color:#b8956a; color:#fff;
    }

    /* Delivery card */
    #pin-delivery-card {
      display:none; margin-top:14px;
      border:1.5px solid rgba(184,149,106,.28); border-radius:12px;
      background:rgba(184,149,106,.05); padding:16px 18px;
      font-family:var(--co-sans,'DM Sans',sans-serif);
    }
    #pin-delivery-card.visible { display:block; }
    .pin-card-ttl {
      font-size:9.5px; letter-spacing:.27em; text-transform:uppercase;
      color:#8a6a3a; font-weight:500; margin-bottom:13px;
    }
    .pin-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:6px 0; border-bottom:1px solid rgba(184,149,106,.12);
      font-size:12.5px;
    }
    .pin-row:last-child { border-bottom:none; padding-bottom:0; }
    .pin-lbl { color:#7a6a50; }
    .pin-val { font-weight:500; color:#2a1f0e; }
    .pin-badge {
      display:inline-block; padding:2px 9px; border-radius:20px;
      font-size:10px; letter-spacing:.1em; text-transform:uppercase; font-weight:500;
    }
    .pin-badge.yes { background:rgba(46,139,87,.10); color:#1a7a48; border:1px solid rgba(46,139,87,.25); }
    .pin-badge.no  { background:rgba(192,57,43,.09); color:#b03020; border:1px solid rgba(192,57,43,.20); }

    @keyframes _pin_spin { to { transform:translateY(-50%) rotate(360deg); } }

    @media(max-width:600px){
      #pin-delivery-card { padding:13px 14px; }
      .pin-pill { font-size:10.5px; padding:5px 11px; }
    }
  `;

  const sEl = document.createElement('style');
  sEl.textContent = CSS;
  document.head.appendChild(sEl);

  /* ═══════════════════════════════════════════
     INIT — runs after DOM ready
  ═══════════════════════════════════════════ */
  function init() {
    const zipEl   = document.getElementById('f-zip');
    if (!zipEl) return;

    /* Spinner */
    const zipField = zipEl.closest('.co-field');
    if (zipField) {
      const sp = document.createElement('div');
      sp.className = 'pin-spinner';
      zipField.appendChild(sp);
    }

    /* UI mount point — after the ZIP row */
    const mountAfter = zipField?.closest('.co-field-row') || zipField;
    const ui = document.createElement('div');
    ui.id = 'pin-ui';
    ui.innerHTML = `
      <div id="pin-msg"></div>
      <div id="pin-area-wrap">
        <span class="pin-area-label">✦ Select Area / Post Office</span>
        <div class="pin-pills" id="pin-pills"></div>
      </div>
      <div id="pin-delivery-card">
        <div class="pin-card-ttl">✦ Delivery Details</div>
        <div class="pin-row"><span class="pin-lbl">Estimated Delivery</span><span class="pin-val" id="pin-edd">—</span></div>
        <div class="pin-row"><span class="pin-lbl">Cash on Delivery</span><span class="pin-val" id="pin-cod">—</span></div>
        <div class="pin-row"><span class="pin-lbl">Serviceable Region</span><span class="pin-val" id="pin-reg">—</span></div>
      </div>
    `;
    mountAfter?.insertAdjacentElement('afterend', ui);

    /* Input listener */
    zipEl.addEventListener('input', function () {
      const raw = this.value.replace(/\D/g, '').slice(0, 6);
      if (this.value !== raw) this.value = raw;

      clearTimeout(_debounce);
      resetUI();

      if (raw.length === 6) {
        if (raw === _lastPin) return;
        showMsg('Fetching location…', 'pin-info');
        _debounce = setTimeout(() => lookup(raw), DEBOUNCE_MS);
      }
    });

    zipEl.addEventListener('paste', () =>
      setTimeout(() => zipEl.dispatchEvent(new Event('input')), 10)
    );
  }

  /* ═══════════════════════════════════════════
     LOOKUP — tries two sources, then gives up gracefully
  ═══════════════════════════════════════════ */
  async function lookup(pin) {
    const zipEl   = document.getElementById('f-zip');
    const zipField = zipEl?.closest('.co-field');
    setLoading(true, zipField);

    /* ── Source 1: api.postalpincode.in ── */
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000); // 5 s timeout
      const res  = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        { signal: ctrl.signal }
      );
      clearTimeout(tid);

      if (res.ok) {
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length) {
          handlePostalResult(pin, data[0].PostOffice);
          setLoading(false, zipField);
          return;
        }
        // Valid response but PIN not found
        if (data?.[0]?.Status === 'Error') {
          showMsg('❌ PIN code not found. Please check and re-enter.', 'pin-err');
          setLoading(false, zipField);
          return;
        }
      }
    } catch (e) {
      // Timeout or CORS → fall through to Source 2
      console.warn('[PIN] Source 1 failed, trying OSM…', e.message);
    }

    /* ── Source 2: Nominatim / OpenStreetMap (always CORS-safe) ── */
    try {
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `postalcode=${pin}&countrycodes=in&format=json&addressdetails=1&limit=3`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res2.ok) {
        const places = await res2.json();
        if (places?.length) {
          const addr  = places[0].address;
          const state = addr.state || addr.state_district || '';
          const city  = addr.county || addr.city || addr.town ||
                        addr.village || addr.state_district || '';
          if (state || city) {
            handleOSMResult(pin, state, city);
            setLoading(false, zipField);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[PIN] Source 2 failed:', e.message);
    }

    /* ── Both sources failed ── */
    showMsg('⚠ Could not fetch location automatically. Please fill City & State manually.', 'pin-err');
    setLoading(false, zipField);
  }

  /* ═══════════════════════════════════════════
     HANDLERS
  ═══════════════════════════════════════════ */
  function handlePostalResult(pin, postOffices) {
    const first = postOffices[0];
    fill('f-state', first.State);
    fill('f-city',  first.District);
    renderPills(postOffices);
    renderDeliveryCard(pin);
    _lastPin = pin;
    showMsg(`✦ ${first.District}, ${first.State} — auto-filled`, 'pin-ok');
  }

  function handleOSMResult(pin, state, city) {
    fill('f-state', state);
    fill('f-city',  city);
    renderDeliveryCard(pin);
    _lastPin = pin;
    showMsg(`✦ ${city}, ${state} — auto-filled`, 'pin-ok');
  }

  /* ═══════════════════════════════════════════
     FILL FIELD + trigger floating label
  ═══════════════════════════════════════════ */
  function fill(id, value) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    el.value = value.trim();
    el.classList.add('has-value', 'pin-filled');
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ═══════════════════════════════════════════
     AREA PILLS
  ═══════════════════════════════════════════ */
  function renderPills(postOffices) {
    const wrap  = document.getElementById('pin-area-wrap');
    const pills = document.getElementById('pin-pills');
    if (!wrap || !pills) return;

    const unique = [...new Map(postOffices.map(p => [p.Name, p])).values()];
    if (unique.length <= 1) return;

    pills.innerHTML = '';
    unique.slice(0, 14).forEach(po => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin-pill';
      b.textContent = po.Name;
      b.addEventListener('click', function () {
        document.querySelectorAll('.pin-pill').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
      });
      pills.appendChild(b);
    });
    wrap.classList.add('visible');
  }

  /* ═══════════════════════════════════════════
     DELIVERY CARD
  ═══════════════════════════════════════════ */
  function renderDeliveryCard(pin) {
    const card = document.getElementById('pin-delivery-card');
    if (!card) return;

    const rule  = DELIVERY_RULES.find(r => pin.startsWith(r[0]));
    const cod   = rule ? rule[1] : true;
    const days  = rule ? rule[2] : 5;
    const reg   = rule ? rule[3] : 'India';

    const edd = new Date();
    edd.setDate(edd.getDate() + days);
    const eddStr = edd.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

    document.getElementById('pin-edd').textContent = `${eddStr} (${days}–${days + 1} days)`;
    document.getElementById('pin-reg').textContent  = reg;
    document.getElementById('pin-cod').innerHTML    = cod
      ? `<span class="pin-badge yes">✓ Available</span>`
      : `<span class="pin-badge no">✕ Not Available</span>`;

    card.classList.add('visible');
  }

  /* ═══════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════ */
  function setLoading(on, zipField) {
    zipField?.classList.toggle('pin-loading', on);
  }

  function showMsg(text, cls) {
    const el = document.getElementById('pin-msg');
    if (!el) return;
    el.textContent = text;
    el.className = `visible ${cls}`;
  }

  function resetUI() {
    const msg  = document.getElementById('pin-msg');
    const area = document.getElementById('pin-area-wrap');
    const card = document.getElementById('pin-delivery-card');
    if (msg)  msg.className = '';
    if (area) area.classList.remove('visible');
    if (card) card.classList.remove('visible');
    ['f-city', 'f-state'].forEach(id =>
      document.getElementById(id)?.classList.remove('pin-filled')
    );
    _lastPin = '';
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();