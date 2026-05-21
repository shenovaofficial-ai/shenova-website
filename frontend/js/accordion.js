/* ============================================================
   accordion.js — Shenova PDP Accordion Fix
   
   Yeh file product.html mein main.js ke BAAD load karo:
   <script src="js/accordion.js"></script>
   
   Yah toggleAcc ko globally define karta hai aur
   DOMContentLoaded pe bhi wire karta hai — dono tarike
   se kaam karta hai (inline onclick + event delegation).
   ============================================================ */

/* ── 1. Global function (inline onclick ke liye) ── */
window.toggleAcc = function(id) {
  const item = document.getElementById(id);
  if (!item) return;

  const isOpen = item.classList.contains('open');

  /* Sab band karo pehle */
  document.querySelectorAll('.pdp-acc-item.open').forEach(function(a) {
    a.classList.remove('open');
    var icon = a.querySelector('.pdp-acc-icon');
    if (icon) icon.style.transform = '';
  });

  /* Agar yeh already open tha toh bas close ho gaya — warna open karo */
  if (!isOpen) {
    item.classList.add('open');
  }
};

/* ── 2. Event delegation — bina onclick ke bhi kaam kare ── */
document.addEventListener('DOMContentLoaded', function() {

  /* Remove any old onclick to avoid double-fire */
  document.querySelectorAll('.pdp-acc-btn').forEach(function(btn) {

    /* Clone trick: purane onclick listeners hata do */
    var fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.addEventListener('click', function() {
      var item = this.closest('.pdp-acc-item');
      if (!item) return;

      var isOpen = item.classList.contains('open');

      /* Sab band */
      document.querySelectorAll('.pdp-acc-item').forEach(function(a) {
        a.classList.remove('open');
      });

      /* Toggle */
      if (!isOpen) item.classList.add('open');
    });
  });

});