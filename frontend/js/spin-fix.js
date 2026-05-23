/* ================================================================
   spin-fix.js  —  Drop-in replacement for the inline spin logic
   Place this AFTER config.js (so API is defined) and AFTER main.js

   Handles:
   • Form validation (name, email, phone)
   • Loading / success / error states
   • Calls POST /api/spin/save with full payload
   • Shows coupon to user after successful save
   ================================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────
  const SPIN_API      = window.API + '/spin/save';
  const SPIN_FULL_API = window.API + '/spin';

  // Prize segments — keep in sync with wheel visual
  const SEGMENTS = [
    { label: '5% OFF',  discount: 5  },
    { label: '10% OFF', discount: 10 },
    { label: '15% OFF', discount: 15 },
    { label: '5% OFF',  discount: 5  },
    { label: '10% OFF', discount: 10 },
    { label: '5% OFF',  discount: 5  },
  ];

  // ── State ──────────────────────────────────────────────────────
  let spinResult   = null;   // { label, discount }
  let isSpinning   = false;
  let hasSpun      = false;

  // ── Helpers ────────────────────────────────────────────────────

  function showToast(msg, type = 'info') {
    // Try to use existing toast system; fall back to a simple banner
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position:     'fixed',
      bottom:       '24px',
      left:         '50%',
      transform:    'translateX(-50%)',
      background:   type === 'error' ? '#c0392b' : '#111',
      color:        '#fff',
      padding:      '14px 28px',
      borderRadius: '999px',
      fontSize:     '13px',
      zIndex:       '99999',
      boxShadow:    '0 8px 30px rgba(0,0,0,.2)',
      letterSpacing:'.05em',
      transition:   'opacity .4s'
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3500);
  }

  function setLoading(btn, loading, defaultText = 'SUBMIT') {
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? 'Saving…' : defaultText;
    btn.style.opacity = loading ? '.6' : '1';
  }

  // ── Validation ─────────────────────────────────────────────────

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function validatePhone(phone) {
    // Allow optional +, digits, spaces, hyphens; 7-15 digits
    return /^\+?[\d\s\-]{7,15}$/.test(phone.trim());
  }

  function validateSpinForm(name, email, phone) {
    if (!name || name.trim().length < 2)
      return 'Please enter your full name (min 2 characters)';
    if (!email || !validateEmail(email))
      return 'Please enter a valid email address';
    if (phone && !validatePhone(phone))
      return 'Please enter a valid phone number (7–15 digits)';
    return null;
  }

  // ── Pick a random prize ────────────────────────────────────────

  function pickPrize() {
    return SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
  }

  // ── Generate coupon code ───────────────────────────────────────

  function makeCoupon() {
    return 'SHENOVA' + Math.floor(1000 + Math.random() * 9000);
  }

  // ── Save lead to backend ───────────────────────────────────────

  async function saveSpinLead({ name, email, phone, coupon, discount, prize }) {
    const payload = {
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
      phone:      (phone || '').trim(),
      coupon:     coupon.toUpperCase(),
      discount:   Number(discount),
      prize:      prize,
      spinResult: prize
    };

    console.log('[Spin] Saving lead →', payload);

    const res = await fetch(SPIN_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[Spin] Save failed:', data);
      throw new Error(data.message || 'Failed to save spin result');
    }

    console.log('[Spin] Lead saved ✅', data);
    return data;
  }

  // ── Show coupon popup ──────────────────────────────────────────

  function showCouponResult(coupon, prize) {
    // Try existing popup elements first
    const codeEl  = document.getElementById('coupon-code')
                 || document.getElementById('spin-coupon-code')
                 || document.querySelector('.coupon-code');
    const prizeEl = document.getElementById('spin-prize')
                 || document.querySelector('.spin-prize-label');
    const popup   = document.getElementById('coupon-popup')
                 || document.getElementById('spin-result-popup');

    if (codeEl)  codeEl.textContent  = coupon;
    if (prizeEl) prizeEl.textContent = prize;
    if (popup)   popup.classList.add('show');

    // Also store in session so checkout can pre-fill
    try { sessionStorage.setItem('spin_coupon', coupon); } catch (_) {}
    try { sessionStorage.setItem('spin_prize',  prize);  } catch (_) {}
  }

  // ── Main spin handler ──────────────────────────────────────────

  window.spinAndSave = async function (opts = {}) {
    if (isSpinning || hasSpun) return;

    const nameEl  = opts.nameEl  || document.getElementById('spin-name')  || document.querySelector('[name="spin_name"]');
    const emailEl = opts.emailEl || document.getElementById('spin-email') || document.querySelector('[name="spin_email"]');
    const phoneEl = opts.phoneEl || document.getElementById('spin-phone') || document.querySelector('[name="spin_phone"]');
    const btn     = opts.btn     || document.getElementById('spin-submit-btn') || document.querySelector('.spin-submit');

    const name  = nameEl?.value  || opts.name  || '';
    const email = emailEl?.value || opts.email || '';
    const phone = phoneEl?.value || opts.phone || '';

    // Validate
    const err = validateSpinForm(name, email, phone);
    if (err) { showToast(err, 'error'); return; }

    isSpinning = true;
    setLoading(btn, true, 'SPIN');

    try {
      const prize  = pickPrize();
      const coupon = makeCoupon();

      // Trigger wheel animation if available
      if (typeof window.animateWheel === 'function') {
        await window.animateWheel(prize.label);
      }

      // Save to DB
      await saveSpinLead({
        name, email, phone,
        coupon,
        discount: prize.discount,
        prize:    prize.label
      });

      hasSpun = true;
      showCouponResult(coupon, prize.label);
      showToast(`🎉 You won ${prize.label}! Coupon: ${coupon}`);

    } catch (saveErr) {
      showToast(saveErr.message || 'Something went wrong. Please try again.', 'error');
      isSpinning = false;
    } finally {
      setLoading(btn, false, 'SPIN');
      if (!hasSpun) isSpinning = false;
    }
  };

  // ── Attach to existing spin form (if present on the page) ──────

  function attachToSpinForm() {
    const form = document.getElementById('spin-form')
              || document.getElementById('spinForm')
              || document.querySelector('form.spin-form');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameEl  = form.querySelector('[name="name"],  #spin-name,  .spin-name');
      const emailEl = form.querySelector('[name="email"], #spin-email, .spin-email');
      const phoneEl = form.querySelector('[name="phone"], #spin-phone, .spin-phone');
      const btn     = form.querySelector('button[type="submit"], .spin-submit');

      await window.spinAndSave({ nameEl, emailEl, phoneEl, btn });
    });
  }

  // ── Wire up copy-coupon button ─────────────────────────────────

  function attachCopyButton() {
    const copyBtn = document.getElementById('copy-coupon')
                 || document.querySelector('.copy-coupon-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('coupon-code')?.textContent
                || sessionStorage.getItem('spin_coupon') || '';
      if (!code) return;
      navigator.clipboard.writeText(code)
        .then(() => showToast('Coupon copied! 📋'))
        .catch(() => showToast('Press Ctrl+C to copy: ' + code));
    });
  }

  // ── Init on DOM ready ──────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachToSpinForm();
      attachCopyButton();
    });
  } else {
    attachToSpinForm();
    attachCopyButton();
  }

})();
