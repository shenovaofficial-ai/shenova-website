/* ================================================================
   SHENOVA — luxury.js  (UPGRADED v3)
   Cinematic homepage interactions — all existing logic preserved.
   New: three-panel reveal, atelier strip stagger, enhanced GSAP
        sequences, cursor gold highlight on gold elements,
        cinematic text split for hero title, refined scroll cue.
   ================================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     LENIS SMOOTH SCROLL
  ────────────────────────────────────────────── */
  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ──────────────────────────────────────────────
     SCROLL PROGRESS BAR
  ────────────────────────────────────────────── */
  const progressBar = document.getElementById('luxProgress');

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });

  /* ──────────────────────────────────────────────
     LOADER
  ────────────────────────────────────────────── */
  const loader = document.getElementById('luxLoader');

  window.addEventListener('load', () => {
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (loader) {
        loader?.classList.add('hide');
        setTimeout(() => {
          document.body.style.overflow = '';
          const hero = document.getElementById('luxHero');
          if (hero) hero?.classList.add('loaded');
          startHeroReveals();
        }, 700);
      }
    }, 1750);
  });

  /* ──────────────────────────────────────────────
     HERO REVEAL SEQUENCE
  ────────────────────────────────────────────── */
  function startHeroReveals() {
    const reveals = document.querySelectorAll('.lux-reveal');
    reveals.forEach((el) => {
      const delay = parseInt(el.dataset.delay || '0', 10) * 195;
      setTimeout(() => el.classList.add('in'), delay + 80);
    });
  }

  /* ──────────────────────────────────────────────
     SCROLL REVEALS (Intersection Observer)
  ────────────────────────────────────────────── */
  const sRevealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target?.classList.add('in');
          sRevealObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
  );

  function initScrollReveals() {
    document.querySelectorAll('.s-reveal').forEach((el) => sRevealObs.observe(el));
  }

  initScrollReveals();

  // Re-observe after dynamic product cards injected by main.js
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    const gridObs = new MutationObserver(() => {
      featuredGrid.querySelectorAll('.product-card, .card').forEach((card) => {
        card?.classList.add('s-reveal');
        sRevealObs.observe(card);
      });
    });
    gridObs.observe(featuredGrid, { childList: true });
  }

  /* ──────────────────────────────────────────────
     NAVIGATION SCROLL BEHAVIOUR
  ────────────────────────────────────────────── */
  const nav = document.getElementById('luxNav');

  function updateNav() {
    if (!nav) return;
    nav?.classList.toggle('scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ──────────────────────────────────────────────
     MOBILE MENU
  ────────────────────────────────────────────── */
  const hamburger  = document.querySelector('.hamburger.lux-hamburger:not(.lux-mm-close-btn)');
  const closeBtn   = document.querySelector('.lux-mm-close-btn');
  const mobileMenu = document.querySelector('.lux-mobile-menu');
if (!hamburger || !mobileMenu) {
  console.warn('Luxury mobile menu elements missing');
}
  function openMobileMenu() {
    hamburger?.classList.add('active');
    mobileMenu?.classList.add('open');
    document.body?.classList.add('menu-open');
  }

  function closeMobileMenu() {
    hamburger?.classList.remove('active');
    mobileMenu?.classList.remove('open');
    document.body?.classList.remove('menu-open');
  }
  if (hamburger && mobileMenu) {
  hamburger?.addEventListener('click', () => {
    mobileMenu?.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
  });

  closeBtn?.addEventListener('click', closeMobileMenu);

  mobileMenu?.querySelectorAll('.lux-mm-nav a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });
  }
  /* ──────────────────────────────────────────────
     CUSTOM CURSOR (desktop only)
  ────────────────────────────────────────────── */
  const cursor    = document.getElementById('luxCursor');
  const cursorDot = document.getElementById('luxCursorDot');
  let mouseX = 0, mouseY = 0;
  let curX   = 0, curY   = 0;

  if (cursor && cursorDot && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.body.classList.add('lux-cursor-active');
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top  = mouseY + 'px';
      cursor?.classList.add('visible');
      cursorDot?.classList.add('visible');
      cursor.style.opacity = '1';
cursorDot.style.opacity = '1';
    });

    function animateCursor() {
      curX += (mouseX - curX) * 0.11;
      curY += (mouseY - curY) * 0.11;
      cursor.style.left = curX + 'px';
      cursor.style.top  = curY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    const hoverTargets = 'a, button, .lux-hcard, .lux-cat-card, .lux-insta-item, .product-card, .card, .lux-dual-img-wrap, .lux-split-image, .lux-tp-img-wrap, .lux-atelier-item';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) cursor?.classList.add('hovered');
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) cursor?.classList.remove('hovered');
    });
  }

  /* ──────────────────────────────────────────────
     PARALLAX HERO IMAGE (subtle, desktop only)
  ────────────────────────────────────────────── */
  const heroImg = document.querySelector('.lux-hero-bg.desktop-hero');

  if (heroImg && window.matchMedia('(min-width: 769px)').matches) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY * 0.24, 130);
      heroImg.style.transform = `translateY(${y}px)`;
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────
     HORIZONTAL SCROLL GALLERY — DRAG + TOUCH
  ────────────────────────────────────────────── */
  const hscrollWrap = document.querySelector('.lux-hscroll-track-wrap');

  if (hscrollWrap) {
    let isDragging = false, startX = 0, scrollLeft = 0;

    hscrollWrap.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX     = e.pageX - hscrollWrap.offsetLeft;
      scrollLeft = hscrollWrap.scrollLeft;
      hscrollWrap.style.cursor = 'grabbing';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      hscrollWrap.style.cursor = 'grab';
    });

    hscrollWrap.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - hscrollWrap.offsetLeft;
      hscrollWrap.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });

    let touchStartX = 0, touchScrollLeft = 0;

    hscrollWrap.addEventListener('touchstart', (e) => {
      touchStartX     = e.touches[0].pageX;
      touchScrollLeft = hscrollWrap.scrollLeft;
    }, { passive: true });

    hscrollWrap.addEventListener('touchmove', (e) => {
      hscrollWrap.scrollLeft = touchScrollLeft - (e.touches[0].pageX - touchStartX);
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────
     CINEMATIC BREAK — zoom on scroll
  ────────────────────────────────────────────── */
  const cinematicBreak = document.querySelector('.lux-cinematic-break');
  if (cinematicBreak) {
    const cineObs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) cinematicBreak?.classList.add('in'); }); },
      { threshold: 0.08 }
    );
    cineObs.observe(cinematicBreak);
  }

  /* ──────────────────────────────────────────────
     GSAP SCROLL ANIMATIONS
  ────────────────────────────────────────────── */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Stagger product cards
    ScrollTrigger.create({
      trigger: '#featured-grid',
      start: 'top 84%',
      onEnter: () => {
        gsap.from('#featured-grid .product-card, #featured-grid .card', {
          opacity: 0,
          y: 48,
          duration: 1,
          stagger: 0.09,
          ease: 'power3.out',
          clearProps: 'all',
        });
      },
    });

    // Manifesto quote — character-feel reveal
    const mqEl = document.querySelector('.lux-manifesto-quote');
    if (mqEl) {
      ScrollTrigger.create({
        trigger: mqEl,
        start: 'top 86%',
        onEnter: () => {
          gsap.from(mqEl, {
            opacity: 0,
            y: 38,
            duration: 1.4,
            ease: 'power4.out',
          });
        },
      });
    }

    // Philosophy strip
    const philoItems = document.querySelectorAll('.lux-philo-item');
    if (philoItems.length) {
      ScrollTrigger.create({
        trigger: '.lux-philosophy-strip',
        start: 'top 90%',
        onEnter: () => {
          gsap.from(philoItems, {
            opacity: 0,
            y: 22,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power3.out',
          });
        },
      });
    }

    // Three-panel editorial — stagger columns
    const tpCols = document.querySelectorAll('.lux-tp-col');
    if (tpCols.length) {
      ScrollTrigger.create({
        trigger: '.lux-three-panel',
        start: 'top 80%',
        onEnter: () => {
          gsap.from(tpCols, {
            opacity: 0,
            y: 52,
            duration: 1.1,
            stagger: 0.14,
            ease: 'power3.out',
          });
        },
      });
    }

    // Dual panel text
    const dualTitle = document.querySelector('.lux-dual-title');
    const dualBody  = document.querySelector('.lux-dual-body');
    if (dualTitle) {
      ScrollTrigger.create({
        trigger: '.lux-dual-text-block',
        start: 'top 83%',
        onEnter: () => {
          gsap.from([dualTitle, dualBody].filter(Boolean), {
            opacity: 0,
            y: 32,
            duration: 1.05,
            stagger: 0.15,
            ease: 'power3.out',
          });
        },
      });
    }

    // Atelier strip items
    const atelierItems = document.querySelectorAll('.lux-atelier-item');
    if (atelierItems.length) {
      ScrollTrigger.create({
        trigger: '.lux-atelier-strip',
        start: 'top 88%',
        onEnter: () => {
          gsap.from(atelierItems, {
            opacity: 0,
            y: 24,
            duration: 0.85,
            stagger: 0.1,
            ease: 'power3.out',
          });
        },
      });
    }

    // Horizontal scroll cards
    const hcards = document.querySelectorAll('.lux-hcard');
    if (hcards.length) {
      ScrollTrigger.create({
        trigger: '.lux-hscroll-section',
        start: 'top 86%',
        onEnter: () => {
          gsap.from(hcards, {
            opacity: 0,
            x: 44,
            duration: 0.95,
            stagger: 0.07,
            ease: 'power3.out',
          });
        },
      });
    }

    // Reviews stagger
    ScrollTrigger.create({
      trigger: '.lux-reviews-grid',
      start: 'top 86%',
      onEnter: () => {
        gsap.from('.lux-review', {
          opacity: 0,
          y: 30,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
        });
      },
    });

    // Insta grid reveal
    ScrollTrigger.create({
      trigger: '.lux-insta-grid',
      start: 'top 88%',
      onEnter: () => {
        gsap.from('.lux-insta-item', {
          opacity: 0,
          scale: 0.96,
          duration: 0.75,
          stagger: 0.06,
          ease: 'power3.out',
        });
      },
    });

    // Category cards
    ScrollTrigger.create({
      trigger: '.lux-cat-grid',
      start: 'top 86%',
      onEnter: () => {
        gsap.from('.lux-cat-card', {
          opacity: 0,
          y: 36,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
        });
      },
    });

    // Cinematic break parallax on scroll (subtle)
    if (cinematicBreak) {
      const cineImage = cinematicBreak.querySelector('img');
      if (cineImage) {
        gsap.to(cineImage, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: cinematicBreak,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }

    // Split-section image subtle parallax
    const splitImg = document.querySelector('.lux-split-image img');
    if (splitImg) {
      gsap.to(splitImg, {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: '.lux-editorial-split',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }

  /* ──────────────────────────────────────────────
     CART COUNT SYNC
  ────────────────────────────────────────────── */
  if (typeof updateCartCount === 'function') updateCartCount();

  /* ──────────────────────────────────────────────
     NEWSLETTER (delegated to main.js handler)
  ────────────────────────────────────────────── */
  window.handleNewsletter = async function () {
    const emailEl = document.getElementById('newsletter-email');
    const email   = emailEl ? emailEl.value.trim() : '';

    if (!email) { showLuxToast('Please enter your email.'); return; }

    try {
      const r    = await fetch(window.API + '/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();

      if (!r.ok) { showLuxToast(data.message || 'Something went wrong.'); return; }

      showLuxToast('Welcome to the inner circle ✦');
      if (emailEl) emailEl.value = '';
    } catch {
      showLuxToast('Server error. Please try again.');
    }
  };

  /* ──────────────────────────────────────────────
     LUXURY TOAST (replaces basic alert)
  ────────────────────────────────────────────── */
  let toastTimer;

  window.showLuxToast = function (msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast?.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast?.classList.remove('show'), 3000);
  };

  window.showToast = window.showLuxToast;

  /* ──────────────────────────────────────────────
     MODAL HELPERS — preserved for main.js
  ────────────────────────────────────────────── */
  window.showModal = function (title, msg) {
    const modal = document.querySelector('.modal');
    if (!modal) return;
    modal.querySelector('h3').textContent = title || '';
    modal.querySelector('p').textContent  = msg   || '';
    modal?.classList.add('open');
    modal.style.display = 'flex';
  };

  window.closeModal = function () {
    const modal = document.querySelector('.modal');
    if (modal) { modal?.classList.remove('open'); modal.style.display = 'none'; }
  };

  /* ──────────────────────────────────────────────
     PAGE TRANSITIONS
  ────────────────────────────────────────────── */
  window.addEventListener('pageshow', () => {
    document.body?.classList.remove('page-out');
    document.body?.classList.add('page-in');
    setTimeout(() => document.body?.classList.remove('page-in'), 100);
  });

})();
/* ===== SAFE REVEAL SYSTEM ===== */

const revealEls = document.querySelectorAll(
  '.s-reveal, .s-reveal-up'
);

const revealObserver = new IntersectionObserver(
(entries)=>{

  entries.forEach(entry=>{

    if(entry.isIntersecting){

      entry.target.classList.add('active');

    }

  });

},
{
  threshold: 0.12
});

revealEls.forEach(el=>{

  el.classList.add('js-reveal');

  revealObserver.observe(el);

});