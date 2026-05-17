/* ================================================================
   about.js  —  SHENOVA · About Page Enhancements
   Runs AFTER main.js (which handles cart, nav, reveal, GSAP setup)
   ================================================================ */

(function () {
  'use strict';

  /* ─── Lenis smooth scroll (if available) ─── */
  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
    const tick = (t) => { lenis.raf(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ─── GSAP + ScrollTrigger (if available) ─── */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    /* Hero image parallax */
    gsap.to('.ab-hero-img', {
      yPercent     : 18,
      ease         : 'none',
      scrollTrigger: {
        trigger : '.ab-hero',
        start   : 'top top',
        end     : 'bottom top',
        scrub   : true,
      }
    });

    /* Statement pull-quote horizontal drift */
    gsap.fromTo('.ab-pull-quote', { x: -24, opacity: 0 }, {
      x            : 0,
      opacity      : 1,
      duration     : 1.4,
      ease         : 'power4.out',
      scrollTrigger: {
        trigger : '.ab-statement',
        start   : 'top 78%',
      }
    });

    /* Cinematic quote scale-in */
    gsap.fromTo('.ab-cine-quote', { scale: .92, opacity: 0 }, {
      scale        : 1,
      opacity      : 1,
      duration     : 1.2,
      ease         : 'power3.out',
      scrollTrigger: {
        trigger : '.ab-cineblock',
        start   : 'top 72%',
      }
    });

    /* Stats row fade in */
    gsap.from('.ab-stats-inner', {
      opacity      : 0,
      y            : 30,
      duration     : 1.0,
      ease         : 'power3.out',
      scrollTrigger: {
        trigger : '.ab-stats',
        start   : 'top 85%',
      }
    });
    gsap.fromTo('.ab-stack-front', { y: 40, opacity: 0 }, {
      y            : 0,
      opacity      : 1,
      duration     : 1.2,
      ease         : 'power3.out',
      scrollTrigger: {
        trigger : '.ab-design',
        start   : 'top 70%',
      }
    });

    /* CTA headline */
    gsap.fromTo('.ab-cta-headline', { y: 60, opacity: 0 }, {
      y            : 0,
      opacity      : 1,
      duration     : 1.4,
      ease         : 'power4.out',
      scrollTrigger: {
        trigger : '.ab-cta',
        start   : 'top 78%',
      }
    });

    /* Photo band subtle parallax on scroll */
    gsap.to('.ab-photoband-track', {
      x            : '-8%',
      ease         : 'none',
      scrollTrigger: {
        trigger : '.ab-photoband',
        start   : 'top bottom',
        end     : 'bottom top',
        scrub   : 1,
      }
    });
  }

  /* ─── Respect reduced-motion preference ─── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--ab-ease', 'linear');
    const allAnimated = document.querySelectorAll(
      '.ab-hl-word, .ab-hero-meta, .ab-hero-sub, .ab-hero-scroll, .ab-hero-strip, .ab-hero-side-label'
    );
    allAnimated.forEach(el => {
      el.style.animation = 'none';
      el.style.opacity   = '1';
      el.style.transform = 'none';
    });
  }

})();
