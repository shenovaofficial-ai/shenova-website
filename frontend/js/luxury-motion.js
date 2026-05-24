/* ════════════════════════════════════════════════════════════════════
   SHENOVA · LUXURY MOTION ENGINE v1.0
   Apple-level smooth UI — universal across all pages

   ✦ Lenis smooth scroll (inertia/buttery)
   ✦ GSAP + ScrollTrigger reveal animations
   ✦ Custom magnetic cursor
   ✦ Page transition wipe
   ✦ Scroll progress bar
   ✦ Ambient glow mouse follower
   ✦ Parallax sections
   ✦ Magnetic buttons
   ✦ Nav hide-on-scroll
   ✦ Lazy image fade-in
   ✦ Mobile swipe gestures for bottom nav

   Does NOT touch: cart, wishlist, products, stories, backend APIs
   ════════════════════════════════════════════════════════════════════ */
;(function () {
  'use strict';

  /* ── 0. UTILITY ─────────────────────────────────────────────── */
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const isMobile = () => window.matchMedia('(max-width:768px)').matches;
  const isTouch = () => window.matchMedia('(hover:none)').matches;
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ── 1. INJECT DOM NODES ─────────────────────────────────────── */
  function injectNodes() {
    // Scroll progress bar
    if (!qs('#shn-progress')) {
      const bar = document.createElement('div');
      bar.id = 'shn-progress';
      document.body.prepend(bar);
    }

    // Page transition overlay
    if (!qs('#shn-transition')) {
      const overlay = document.createElement('div');
      overlay.id = 'shn-transition';
      document.body.appendChild(overlay);
    }

    // Custom cursor (desktop only)
    if (!qs('#shn-cursor') && !isTouch()) {
      const cursor = document.createElement('div');
      cursor.id = 'shn-cursor';
      const dot = document.createElement('div');
      dot.id = 'shn-cursor-dot';
      document.body.appendChild(cursor);
      document.body.appendChild(dot);
    }

    // Ambient glow (desktop only)
    if (!qs('#shn-glow') && !isTouch()) {
      const glow = document.createElement('div');
      glow.id = 'shn-glow';
      document.body.appendChild(glow);
    }
  }

  /* ── 2. LENIS SMOOTH SCROLL ─────────────────────────────────── */
  let lenis = null;

  function initLenis() {
    if (prefersReducedMotion()) return;

    // Wait for Lenis to be available
    const tryInit = () => {
      if (typeof Lenis === 'undefined') {
        setTimeout(tryInit, 50);
        return;
      }

      lenis = new Lenis({
        duration: 1.35,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2.0,
        infinite: false,
        autoResize: true,
        prevent: (node) =>
          node.classList.contains('drawer') ||
          node.classList.contains('modal-card') ||
          node.id === 'stories-viewer' ||
          node.closest('.drawer') !== null ||
          node.closest('[data-lenis-prevent]') !== null
      });

      // Hook GSAP ScrollTrigger if available
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        // Fallback RAF loop
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }

      // Expose globally for drawer/modal scroll lock
      window.lenisInstance = lenis;
      window.lenisStop = () => lenis.stop();
      window.lenisStart = () => lenis.start();

      // Patch existing scroll locks to pause Lenis
      patchScrollLocks();
    };

    tryInit();
  }

  /* Patch lockBody / unlockBody to also pause/resume Lenis */
  function patchScrollLocks() {
    const origLock = window.lockBody;
    const origUnlock = window.unlockBody;

    window.lockBody = function () {
      lenis && lenis.stop();
      if (typeof origLock === 'function') origLock();
      else {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }
    };

    window.unlockBody = function () {
      lenis && lenis.start();
      if (typeof origUnlock === 'function') origUnlock();
      else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    };

    // Also patch openCart / closeCart if they exist
    const tryPatchCart = () => {
      if (typeof window.openCart === 'function' && !window.openCart._lenisPatch) {
        const origOpen = window.openCart;
        window.openCart = function (...args) {
          lenis && lenis.stop();
          return origOpen.apply(this, args);
        };
        window.openCart._lenisPatch = true;
      }
      if (typeof window.closeCart === 'function' && !window.closeCart._lenisPatch) {
        const origClose = window.closeCart;
        window.closeCart = function (...args) {
          const r = origClose.apply(this, args);
          setTimeout(() => lenis && lenis.start(), 600);
          return r;
        };
        window.closeCart._lenisPatch = true;
      }
    };
    // Cart functions might load after this, retry
    setTimeout(tryPatchCart, 500);
    setTimeout(tryPatchCart, 1500);
  }

  /* ── 3. SCROLL PROGRESS BAR ─────────────────────────────────── */
  function initScrollProgress() {
    const bar = qs('#shn-progress');
    if (!bar) return;

    // Only reveal announce bar + progress bar after loader exits
    function activateBar() {
      document.body.classList.add('loader-done');
    }

    // index.html loader → #sh-ld gets class "out"
    // product.html loader → #pdp-loader gets class "hide"
    const loader = qs('#sh-ld, #pdp-loader');
    if (loader) {
      // If loader already exited before our script ran
      if (loader.classList.contains('out') || loader.classList.contains('hide')) {
        activateBar();
      } else {
        new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.target.classList.contains('out') || m.target.classList.contains('hide')) {
              setTimeout(activateBar, 50);
              break;
            }
          }
        }).observe(loader, { attributes: true, attributeFilter: ['class'] });
      }
    } else {
      // No loader on this page — activate immediately
      activateBar();
    }

    let ticking = false;
    function updateProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── 4. CUSTOM CURSOR ───────────────────────────────────────── */
  function initCursor() {
    if (isTouch()) return;

    const cursor = qs('#shn-cursor');
    const dot = qs('#shn-cursor-dot');
    const glow = qs('#shn-glow');
    if (!cursor || !dot) return;

    let mouseX = -200, mouseY = -200;
    let cursorX = -200, cursorY = -200;
    let glowX = -200, glowY = -200;
    let isVisible = false;

    // Smooth cursor RAF loop
    function animateCursor() {
      // Cursor follows with slight lag
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cursor.style.left = cursorX + 'px';
      cursor.style.top  = cursorY + 'px';

      // Dot snaps more sharply
      dot.style.left = mouseX + 'px';
      dot.style.top  = mouseY + 'px';

      // Glow follows lazily
      if (glow) {
        glowX += (mouseX - glowX) * 0.06;
        glowY += (mouseY - glowY) * 0.06;
        glow.style.left = glowX + 'px';
        glow.style.top  = glowY + 'px';
      }

      requestAnimationFrame(animateCursor);
    }

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        cursor.classList.add('visible');
        dot.classList.add('visible');
        if (glow) glow.classList.add('visible');
      }
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('visible');
      dot.classList.remove('visible');
      if (glow) glow.classList.remove('visible');
      isVisible = false;
    });

    // Hover state on interactive elements
    const hoverEls = 'a, button, .product-card, .sh-cc, .sh-gc, [role="button"], label, .btn, .shn-magnetic';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverEls)) {
        cursor.classList.add('hovered');
        dot.style.opacity = '0';
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverEls)) {
        cursor.classList.remove('hovered');
        dot.style.opacity = '1';
      }
    });

    // Text input mode
    const textEls = 'input[type="text"], input[type="email"], input[type="tel"], input[type="password"], textarea';
    document.addEventListener('mouseover', (e) => {
      if (e.target.matches(textEls)) cursor.classList.add('text-mode');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.matches(textEls)) cursor.classList.remove('text-mode');
    });

    // Click shrink
    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));

    requestAnimationFrame(animateCursor);
  }

  /* ── 5. MAGNETIC BUTTONS ─────────────────────────────────────── */
  function initMagnetic() {
    if (isTouch() || prefersReducedMotion()) return;

    // Add magnetic class to primary buttons
    const magneticTargets = qsa('.btn, .add-to-cart, .nav-logo, .cart-btn');
    magneticTargets.forEach(el => el.classList.add('shn-magnetic'));

    function applyMagnetic(el) {
      if (el._magnet) return;
      el._magnet = true;

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * 0.28;
        const dy = (e.clientY - cy) * 0.28;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    }

    qsa('.shn-magnetic').forEach(applyMagnetic);

    // Apply to dynamically added elements
    new MutationObserver(() => {
      qsa('.shn-magnetic:not([data-mag])').forEach(el => {
        el.dataset.mag = '1';
        applyMagnetic(el);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── 6. SCROLL REVEAL ───────────────────────────────────────── */
  function initScrollReveal() {
    // Auto-assign data-shn-reveal to common elements that don't have it
    const autoRevealSelectors = [
      '.sr:not([data-shn-reveal])',
      'section h1:not([data-shn-reveal]):not(.no-reveal)',
      'section h2:not([data-shn-reveal]):not(.no-reveal)',
      '.eyebrow:not([data-shn-reveal]):not(.no-reveal)',
      '.product-card:not([data-shn-reveal])',
      '.sh-cc:not([data-shn-reveal])',
      '.sh-gc:not([data-shn-reveal])',
      '.sh-rv:not([data-shn-reveal])',
      'footer:not([data-shn-reveal])'
    ];

    // Observe elements with data-shn-reveal
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('shn-visible');
          // Also trigger .sr.on for existing animations
          entry.target.classList.add('on');
          revealObs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    // Observe all elements with data-shn-reveal
    function observeReveal() {
      qsa('[data-shn-reveal]').forEach(el => revealObs.observe(el));

      // Also handle existing .sr elements (from luxury.css)
      qsa('.sr:not(.on)').forEach((el, i) => {
        // Don't add if already has its own observer
        if (!el.dataset.shnObserved) {
          el.dataset.shnObserved = '1';
          revealObs.observe(el);
        }
      });
    }

    observeReveal();

    // Watch for dynamic content (product grids)
    new MutationObserver(observeReveal).observe(
      qs('#featured-grid, #wish-grid, .product-grid, main') || document.body,
      { childList: true, subtree: true }
    );

    // Stagger grids automatically
    function staggerGrid(grid) {
      const cards = qsa('.product-card, .sh-cc, .sh-gc', grid);
      cards.forEach((card, i) => {
        if (!card.style.transitionDelay) {
          card.style.transitionDelay = (i % 6 * 0.08) + 's';
        }
      });
    }

    qsa('.grid, #featured-grid, .product-grid').forEach(staggerGrid);
    new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.target.matches('.grid, #featured-grid, .product-grid'))
          staggerGrid(m.target);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── 7. PARALLAX ─────────────────────────────────────────────── */
  function initParallax() {
    if (prefersReducedMotion() || isMobile()) return;

    const heroImgs = qsa('.product-hero-img, .ab-hero-img, [class*="hero"] img:first-of-type');

    if (heroImgs.length === 0) return;

    let ticking = false;

    function updateParallax() {
      const scrollY = window.scrollY;
      heroImgs.forEach(img => {
        const section = img.closest('section') || img.parentElement;
        const rect = section.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const offset = (progress - 0.5) * 80;
        img.style.transform = `translateY(${offset}px) scale(1.08)`;
      });

      // Custom data-parallax elements
      qsa('[data-parallax]').forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (window.innerHeight / 2 - rect.top - rect.height / 2) * speed;
        el.style.transform = `translateY(${offset}px)`;
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* ── 8. NAV HIDE ON SCROLL ──────────────────────────────────── */
  function initNavHide() {
    const nav = qs('nav.nav, nav.sh-nav, nav.lux-nav');
    if (!nav) return;

    let lastY = 0;
    let hidden = false;
    let ticking = false;

    function update() {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      // Hide going down (past 120px), show going up
      if (currentY > 120) {
        if (delta > 6 && !hidden) {
          nav.classList.add('nav-hidden');
          hidden = true;
        } else if (delta < -4 && hidden) {
          nav.classList.remove('nav-hidden');
          hidden = false;
        }
      } else {
        if (hidden) {
          nav.classList.remove('nav-hidden');
          hidden = false;
        }
      }

      lastY = currentY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── 9. PAGE TRANSITIONS ─────────────────────────────────────── */
  function initPageTransitions() {
    if (prefersReducedMotion()) return;

    const overlay = qs('#shn-transition');
    if (!overlay) return;

    // Play leave animation on page load (reveal the page)
    function playPageReveal() {
      overlay.classList.add('leaving');
      overlay.style.opacity = '1';
      overlay.style.transform = 'scaleY(1)';
      // Force reflow
      overlay.getBoundingClientRect();
      overlay.classList.add('leaving');
      setTimeout(() => {
        overlay.style.opacity = '';
        overlay.style.transform = '';
        overlay.classList.remove('leaving');
      }, 500);
    }

    // Intercept internal links for smooth transition
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');

      // Skip: external, hash, mailto, tel, js, new tab
      if (!href ||
          href.startsWith('#') ||
          href.startsWith('http') ||
          href.startsWith('mailto') ||
          href.startsWith('tel') ||
          href.startsWith('javascript') ||
          link.target === '_blank' ||
          e.ctrlKey || e.metaKey || e.shiftKey) return;

      e.preventDefault();

      // Enter animation
      overlay.style.transform = 'scaleY(0)';
      overlay.style.transformOrigin = 'bottom center';
      overlay.style.opacity = '1';
      overlay.getBoundingClientRect(); // force reflow
      overlay.style.transition = 'transform 0.5s cubic-bezier(0.76,0,0.24,1)';
      overlay.style.transform = 'scaleY(1)';

      setTimeout(() => {
        window.location.href = href;
      }, 520);
    });

    // Reveal on load
    window.addEventListener('pageshow', playPageReveal);
    playPageReveal();
  }

  /* ── 10. LAZY IMAGE FADE ─────────────────────────────────────── */
  function initLazyImages() {
    const imgs = qsa('img');

    imgs.forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      }
    });

    // Watch for dynamically inserted images
    new MutationObserver(() => {
      qsa('img:not([data-lazy-watched])').forEach(img => {
        img.dataset.lazyWatched = '1';
        if (img.complete && img.naturalWidth > 0) {
          img.classList.add('loaded');
        } else {
          img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── 11. MOBILE BOTTOM NAV HIDE ON SCROLL ────────────────────── */
  function initBottomNavHide() {
    const nav = qs('.shn-bottom-nav');
    if (!nav || !isMobile()) return;

    let lastY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY;

        // Hide on scroll down, show on scroll up or near bottom
        const nearBottom = (window.innerHeight + currentY) >= document.body.scrollHeight - 100;
        if (delta > 8 && !nearBottom) {
          nav.classList.add('hidden');
        } else if (delta < -5 || nearBottom) {
          nav.classList.remove('hidden');
        }

        lastY = currentY;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── 12. GSAP ENHANCED ANIMATIONS ───────────────────────────── */
  function initGSAP() {
    if (prefersReducedMotion()) return;

    const tryGSAP = () => {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        setTimeout(tryGSAP, 100);
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      // Text split reveal for headings with class .gsap-split
      qsa('.gsap-split, .ab-hero-title, .hero-headline, .cg-hero-title, .sg-hero-title, .rt-hero-title, .sp-hero-title').forEach(el => {
        if (el.dataset.gsapDone) return;
        el.dataset.gsapDone = '1';

        gsap.fromTo(el, {
          y: 60,
          opacity: 0,
          skewY: 2
        }, {
          y: 0,
          opacity: 1,
          skewY: 0,
          duration: 1.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true
          }
        });
      });

      // Horizontal scroll eyebrow
      qsa('.eyebrow, .ab-eyebrow, .hero-eyebrow-line, .cg-hero-eye, .sg-hero-eye').forEach(el => {
        if (el.dataset.gsapDone) return;
        el.dataset.gsapDone = '1';

        gsap.fromTo(el, {
          x: -20,
          opacity: 0
        }, {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true
          }
        });
      });

      // Stagger product cards
      qsa('.grid, #featured-grid, .product-grid').forEach(grid => {
        if (grid.dataset.gsapDone) return;
        grid.dataset.gsapDone = '1';

        ScrollTrigger.create({
          trigger: grid,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.fromTo(qsa('.product-card, .sh-cc, .sh-gc', grid), {
              y: 50,
              opacity: 0
            }, {
              y: 0,
              opacity: 1,
              stagger: 0.07,
              duration: 0.9,
              ease: 'power3.out'
            });
          }
        });
      });

      // Animate stat numbers if present
      qsa('.ab-hero-index, [class*="stat-num"], [class*="counter"]').forEach(el => {
        if (el.dataset.gsapDone) return;
        el.dataset.gsapDone = '1';

        const num = parseFloat(el.textContent);
        if (!isNaN(num)) {
          gsap.fromTo({ val: 0 }, {
            val: num
          }, {
            val: num,
            duration: 1.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true
            },
            onUpdate: function () {
              el.textContent = Math.round(this.targets()[0].val);
            }
          });
        }
      });

      // Watch for new grids added dynamically
      new MutationObserver(() => {
        qsa('.grid:not([data-gsap-done]), #featured-grid:not([data-gsap-done])').forEach(grid => {
          grid.dataset.gsapDone = '1';
          const cards = qsa('.product-card, .sh-cc, .sh-gc', grid);
          if (cards.length > 0) {
            gsap.fromTo(cards, {
              y: 40,
              opacity: 0
            }, {
              y: 0,
              opacity: 1,
              stagger: 0.06,
              duration: 0.75,
              ease: 'power3.out'
            });
          }
        });
      }).observe(document.body, { childList: true, subtree: true });
    };

    tryGSAP();
  }

  /* ── 13. BUTTON RIPPLE EFFECT ────────────────────────────────── */
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .add-to-cart, button.shn-magnetic');
      if (!btn) return;

      const ripple = document.createElement('span');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      Object.assign(ripple.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        left: x + 'px',
        top: y + 'px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        transform: 'scale(0)',
        animation: 'shnRipple 0.6s ease-out forwards',
        pointerEvents: 'none',
        zIndex: '1'
      });

      if (!qs('style#shn-ripple-style')) {
        const st = document.createElement('style');
        st.id = 'shn-ripple-style';
        st.textContent = `
          @keyframes shnRipple {
            to { transform: scale(1); opacity: 0; }
          }
        `;
        document.head.appendChild(st);
      }

      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 650);
    });
  }

  /* ── 14. DRAWER SCROLL PREVENTION ───────────────────────────── */
  function initDrawerScroll() {
    // Ensure cart drawer has proper overscroll
    const tryPatch = () => {
      const drawer = qs('.drawer, .cart-drawer, [class*="drawer"]');
      if (drawer) {
        drawer.setAttribute('data-lenis-prevent', '');
        drawer.style.overscrollBehavior = 'contain';
        drawer.style.webkitOverflowScrolling = 'touch';
      }
    };

    tryPatch();
    setTimeout(tryPatch, 1000);
  }

  /* ── 15. STORIES PROTECTION ──────────────────────────────────── */
  function protectStories() {
    // Stories viewer should never be affected by our scroll lock
    const tryProtect = () => {
      const storiesViewer = qs('#stories-viewer, .stories-viewer, [id*="stories"]');
      if (storiesViewer) {
        storiesViewer.setAttribute('data-lenis-prevent', '');
      }
    };

    tryProtect();
    new MutationObserver(tryProtect).observe(document.body, { childList: true });
  }

  /* ── 16. DIVIDER REVEAL ─────────────────────────────────────── */
  function initDividers() {
    qsa('hr, .divider, [class*="divider"]').forEach(el => {
      el.classList.add('shn-divider');
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('on');
          obs.disconnect();
        }
      }, { threshold: 0.5 });
      obs.observe(el);
    });
  }

  /* ── 17. TOUCH GESTURES (mobile swipe) ───────────────────────── */
  function initTouchGestures() {
    if (!isTouch()) return;

    // Add touch-action optimization
    document.body.style.touchAction = 'pan-y';
    qsa('.product-card, .sh-cc, .sh-gc').forEach(card => {
      card.style.webkitTapHighlightColor = 'transparent';
    });

    // Swipe-to-close cart drawer
    const drawer = qs('.drawer');
    if (!drawer) return;

    let startX = 0;
    drawer.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });

    drawer.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 60 && typeof window.closeCart === 'function') {
        window.closeCart();
      }
    }, { passive: true });
  }

  /* ── 18. ANNOUNCE BAR SMOOTH HIDE ───────────────────────────── */
  function initAnnouncebar() {
    const bar = qs('#sh-bar, .announce-bar, [id*="announce"]');
    if (!bar) return;

    bar.style.transition = 'height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)';

    const closeBtn = qs('.sh-bar-x, [class*="bar-close"], [class*="announce-close"]', bar);
    if (closeBtn) {
      const orig = closeBtn.onclick;
      closeBtn.onclick = function(e) {
        bar.style.transform = 'translateY(-100%)';
        bar.style.opacity = '0';
        setTimeout(() => {
          bar.classList.add('gone');
          bar.style.display = 'none';
        }, 420);
        if (orig) orig.call(this, e);
      };
    }
  }

  /* ── INIT ALL ────────────────────────────────────────────────── */
  function init() {
    injectNodes();
    initScrollProgress();
    initLazyImages();
    initDrawerScroll();
    protectStories();

    if (!prefersReducedMotion()) {
      initLenis();
      initCursor();
      initMagnetic();
      initParallax();
      initNavHide();
      initPageTransitions();
      initGSAP();
      initRipple();
      initBottomNavHide();
      initTouchGestures();
      initDividers();
      initAnnouncebar();
      initScrollReveal();
    } else {
      // Reduced motion: just show everything immediately
      qsa('.sr, [data-shn-reveal]').forEach(el => {
        el.classList.add('on', 'shn-visible');
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small defer to not block critical rendering
    requestAnimationFrame(() => setTimeout(init, 0));
  }

})();