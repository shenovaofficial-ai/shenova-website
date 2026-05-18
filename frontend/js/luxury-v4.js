/* ================================================================
   SHENOVA — luxury-v4.js
   Homepage enhancement additions (v4 upgrade)
   Handles: announcement bar, enhanced mobile UX, signature strip
   Load AFTER luxury.js in index.html
   ================================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     ANNOUNCEMENT BAR
  ────────────────────────────────────────────── */
  const ANNOUNCE_KEY = 'shenova_announce_dismissed_v4';
  const announceBar  = document.getElementById('luxAnnounceBar');

  function initAnnounceBar() {
    if (!announceBar) return;

    // If already dismissed, hide immediately
    if (localStorage.getItem(ANNOUNCE_KEY)) {
      dismissAnnounceBarNow();
      return;
    }

    // Otherwise show and shift nav
    document.body.classList.remove('bar-dismissed');
  }

  window.dismissAnnounceBar = function () {
    if (!announceBar) return;
    announceBar.style.transition = 'opacity 0.4s, height 0.4s 0.3s';
    announceBar.style.opacity = '0';
    setTimeout(() => {
      dismissAnnounceBarNow();
      localStorage.setItem(ANNOUNCE_KEY, '1');
    }, 700);
  };

  function dismissAnnounceBarNow() {
    if (!announceBar) return;
    announceBar.classList.add('dismissed');
    document.body.classList.add('bar-dismissed');
  }

  initAnnounceBar();

  /* ──────────────────────────────────────────────
     SIGNATURE STRIP — GSAP REVEAL
  ────────────────────────────────────────────── */
  if (window.gsap && window.ScrollTrigger) {
    const sigItems = document.querySelectorAll('.lux-sig-item, .lux-sig-center');
    if (sigItems.length) {
      ScrollTrigger.create({
        trigger: '.lux-signature-strip',
        start: 'top 88%',
        onEnter: () => {
          gsap.from(sigItems, {
            opacity: 0,
            y: 24,
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
          });
        },
      });
    }
  }

  /* ──────────────────────────────────────────────
     MOBILE HERO TOUCH SWIPE (immersive feel)
     Subtle fade on scroll for hero content
  ────────────────────────────────────────────── */
  const heroContent = document.querySelector('.lux-hero-content');

  if (heroContent && window.matchMedia('(max-width: 768px)').matches) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / (heroHeight * 0.5), 1);
      const opacity = 1 - progress * 0.6;
      heroContent.style.opacity = opacity.toString();
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────
     ENHANCED MOBILE SCROLL EXPERIENCE
     Adds momentum hint on horizontal gallery
  ────────────────────────────────────────────── */
  const hscrollTrack = document.getElementById('hscrollTrack');

  if (hscrollTrack && window.matchMedia('(max-width: 768px)').matches) {
    // Auto-scroll hint on mobile (subtle, one time)
    const HINT_KEY = 'shenova_hscroll_hinted';

    if (!sessionStorage.getItem(HINT_KEY)) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              hscrollTrack.scrollBy({ left: 80, behavior: 'smooth' });
              setTimeout(() => hscrollTrack.scrollBy({ left: -80, behavior: 'smooth' }), 600);
              sessionStorage.setItem(HINT_KEY, '1');
            }, 400);
            obs.disconnect();
          }
        });
      }, { threshold: 0.6 });

      obs.observe(hscrollTrack);
    }
  }

  /* ──────────────────────────────────────────────
     SPIN POPUP TIMING FIX
     Override main.js spin popup to only show
     AFTER the luxury loader has finished
  ────────────────────────────────────────────── */
  // main.js fires spin popup at window.load + 1200ms
  // The lux loader takes ~2500ms (1750 + 700 transition)
  // We patch the spin popup to respect the loader

  const spinPopup = document.getElementById('spin-popup');

  if (spinPopup) {
    // Hide immediately if it shows before loader is gone
    const loaderEl = document.getElementById('luxLoader');

    function ensureSpinAfterLoader() {
      if (loaderEl && !loaderEl.classList.contains('hide')) {
        // Loader still visible — defer spin popup
        spinPopup.classList.remove('show');
        document.body.style.overflow = ''; // undo overflow:hidden from main.js
      }
    }

    // Watch for loader hide
    if (loaderEl) {
      const loaderObs = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.target.classList.contains('hide')) {
            // Loader gone — show spin after 3.5s from loader dismiss
            setTimeout(() => {
              spinPopup.classList.add('show');
              document.body.style.overflow = 'hidden';
            }, 3500);
            loaderObs.disconnect();
          }
        });
      });

      loaderObs.observe(loaderEl, { attributes: true, attributeFilter: ['class'] });
    }

    // Ensure spin popup doesn't show too early
    ensureSpinAfterLoader();
  }

  /* ──────────────────────────────────────────────
     CATEGORY CARD — ENHANCED MOBILE TAP EFFECT
  ────────────────────────────────────────────── */
  document.querySelectorAll('.lux-cat-card').forEach((card) => {
    card.addEventListener('touchstart', function () {
      this.style.transform = 'scale(0.985)';
    }, { passive: true });
    card.addEventListener('touchend', function () {
      this.style.transform = '';
    }, { passive: true });
    card.addEventListener('touchcancel', function () {
      this.style.transform = '';
    }, { passive: true });
  });

  /* ──────────────────────────────────────────────
     PRODUCT CARD — TAP FEEDBACK ON MOBILE
  ────────────────────────────────────────────── */
  function addTapFeedback() {
    document.querySelectorAll('.product-card').forEach((card) => {
      if (card.dataset.tapBound) return;
      card.dataset.tapBound = '1';
      card.addEventListener('touchstart', function () {
        this.style.transition = 'transform 0.15s ease';
        this.style.transform = 'scale(0.978)';
      }, { passive: true });
      card.addEventListener('touchend', function () {
        this.style.transform = '';
      }, { passive: true });
      card.addEventListener('touchcancel', function () {
        this.style.transform = '';
      }, { passive: true });
    });
  }

  // Run on initial load and after products are injected
  addTapFeedback();

  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    const cardObs = new MutationObserver(() => addTapFeedback());
    cardObs.observe(featuredGrid, { childList: true });
  }

  /* ──────────────────────────────────────────────
     SCROLL PROGRESS (sync with luxury.js)
  ────────────────────────────────────────────── */
  // Handled by luxury.js — nothing to add

  /* ──────────────────────────────────────────────
     INSTAGRAM GRID — VIEWPORT-BASED LAZY REVEAL
  ────────────────────────────────────────────── */
  const instaItems = document.querySelectorAll('.lux-insta-item');
  if (instaItems.length && window.IntersectionObserver) {
    const instaObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            instaObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    instaItems.forEach((item, i) => {
      item.style.transitionDelay = (i * 0.055) + 's';
      instaObs.observe(item);
    });
  }

  /* ──────────────────────────────────────────────
     MANIFESTO QUOTE — WORD SPLIT ANIMATION
     (progressive enhancement)
  ────────────────────────────────────────────── */
  const manifestoQuote = document.querySelector('.lux-manifesto-quote');

  if (manifestoQuote && window.IntersectionObserver && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const html = manifestoQuote.innerHTML;
    // Split by lines (br tags)
    const lines = html.split(/<br\s*\/?>/gi);
    manifestoQuote.innerHTML = lines
      .map((line, i) => `<span class="mq-line" style="display:block;overflow:hidden"><span class="mq-line-inner" style="display:block;transition:transform 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s,opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s;transform:translateY(40px);opacity:0">${line}</span></span>`)
      .join('');

    const mqObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.mq-line-inner').forEach((el) => {
              el.style.transform = 'none';
              el.style.opacity = '1';
            });
            mqObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    mqObs.observe(manifestoQuote);
  }

  /* ──────────────────────────────────────────────
     NEWSLETTER — ELEGANT FOCUS STATE
  ────────────────────────────────────────────── */
  const emailInput = document.getElementById('newsletter-email');
  const nlForm     = document.querySelector('.lux-newsletter-form');

  if (emailInput && nlForm) {
    emailInput.addEventListener('focus', () => nlForm.classList.add('focused'));
    emailInput.addEventListener('blur',  () => nlForm.classList.remove('focused'));
  }

  /* ──────────────────────────────────────────────
     BODY SCROLL LOCK — PREVENT CLS ON MODAL OPEN
  ────────────────────────────────────────────── */
  // Preserve scrollbar width to avoid layout shift when drawer opens
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.documentElement.style.setProperty('--scrollbar-w', scrollbarWidth + 'px');
  }

})();
