/* ═══════════════════════════════════════════════════════════════
   SHENOVA · Stories Engine
   File: js/stories.js

   Load AFTER main.js (which defines API_BASE / API).
   Requires: no external deps (pure vanilla JS).
═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */
  const STORY_DURATION_MS  = 6000;   // default per-story duration (images)
  const VIDEO_MAX_MS       = 30000;  // safety cap for videos
  const SWIPE_THRESHOLD_PX = 50;     // px swipe to trigger nav
  const API_STORIES        = (global.API || '') + '/stories';

  /* ── State ───────────────────────────────────────────────── */
  let stories       = [];
  let currentIndex  = 0;
  let timer         = null;     // rAF timer handle
  let startTime     = null;     // rAF start timestamp
  let duration      = STORY_DURATION_MS;
  let paused        = false;
  let muted         = true;
  let touchStartX   = 0;
  let touchStartY   = 0;
  let touchStartT   = 0;
  let currentMedia  = null;     // <img> or <video> element
  let mediaRetries  = 0;        // per-story load retry count

  /* ── DOM refs (created in buildDOM) ─────────────────────── */
  let viewer, backdrop, card,
      progressWrap, headerEl,
      mediaContainer, mediaEl,
      captionEl, ctaEl,
      muteBtn, closeBtn,
      counterEl, loadingEl,
      emptyEl, errorEl;

  /* ═══════════════════════════════════════════════════════════
     BUILD DOM
  ═══════════════════════════════════════════════════════════ */
  function buildDOM () {
    if (document.getElementById('shenova-story-viewer')) return;

    const v = document.createElement('div');
    v.id        = 'shenova-story-viewer';
    v.className = 'story-viewer';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.setAttribute('aria-label', 'SHENOVA Stories');

    v.innerHTML = `
      <!-- Backdrop -->
      <div class="story-backdrop" id="storyBackdrop" aria-hidden="true"></div>

      <!-- Card -->
      <div class="story-card" id="storyCard">

        <!-- Grain overlay -->
        <div class="story-grain" aria-hidden="true"></div>

        <!-- Gradient overlays -->
        <div class="story-overlay-top"  aria-hidden="true"></div>
        <div class="story-overlay-bot"  aria-hidden="true"></div>

        <!-- Progress bars -->
        <div class="story-progress-wrap" id="storyProgressWrap" aria-hidden="true"></div>

        <!-- Header -->
        <div class="story-header" id="storyHeader">
          <div class="story-avatar">
            <span class="story-avatar-mark">S</span>
          </div>
          <div class="story-brand-info">
            <div class="story-brand-name">SHENOVA</div>
            <div class="story-time-ago" id="storyTimeAgo">Now</div>
          </div>
          <div class="story-controls">
            <button class="story-ctrl-btn" id="storyMuteBtn" aria-label="Toggle mute">
              ${iconMuted()}
            </button>
            <button class="story-ctrl-btn" id="storyCloseBtn" aria-label="Close stories">
              ${iconClose()}
            </button>
          </div>
        </div>

        <!-- Media container -->
        <div id="storyMediaContainer" style="position:absolute;inset:0;z-index:0;"></div>

        <!-- Tap zones -->
        <div class="story-tap-prev" id="storyTapPrev" aria-label="Previous story"></div>
        <div class="story-tap-next" id="storyTapNext" aria-label="Next story"></div>

        <!-- Caption + CTA -->
        <div class="story-caption-wrap" id="storyCaptionWrap">
          <p class="story-caption" id="storyCaption"></p>
          <a class="story-cta-btn" id="storyCtaBtn" style="display:none" target="_blank" rel="noopener">
            ${iconArrow()}
            <span id="storyCtaText">Shop Now</span>
          </a>
        </div>

        <!-- Counter -->
        <div class="story-counter" id="storyCounter"></div>

        <!-- Loading overlay -->
        <div class="story-loading" id="storyLoading" style="display:none;">
          <div class="story-spinner"></div>
          <span class="story-loading-text">Loading</span>
        </div>

        <!-- Empty state -->
        <div class="story-empty" id="storyEmpty" style="display:none;">
          <div class="story-empty-icon">S</div>
          <div class="story-empty-text">No stories available</div>
        </div>

        <!-- Media error state -->
        <div class="story-empty" id="storyError" style="display:none;background:rgba(0,0,0,.7);">
          <div class="story-empty-icon" style="font-size:28px">⚠</div>
          <div class="story-empty-text">Media could not be loaded</div>
          <button
            onclick="window.SHStories && window.SHStories.skipCurrent()"
            style="margin-top:14px;padding:10px 22px;background:#fff;color:#111;border:none;border-radius:999px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer">
            Skip
          </button>
        </div>

      </div><!-- /card -->
    `;

    document.body.appendChild(v);

    /* Cache refs */
    viewer         = v;
    backdrop       = v.querySelector('#storyBackdrop');
    card           = v.querySelector('#storyCard');
    progressWrap   = v.querySelector('#storyProgressWrap');
    headerEl       = v.querySelector('#storyHeader');
    mediaContainer = v.querySelector('#storyMediaContainer');
    captionEl      = v.querySelector('#storyCaption');
    ctaEl          = v.querySelector('#storyCtaBtn');
    muteBtn        = v.querySelector('#storyMuteBtn');
    closeBtn       = v.querySelector('#storyCloseBtn');
    counterEl      = v.querySelector('#storyCounter');
    loadingEl      = v.querySelector('#storyLoading');
    emptyEl        = v.querySelector('#storyEmpty');
    errorEl        = v.querySelector('#storyError');

    /* Events */
    backdrop.addEventListener('click', closeViewer);
    closeBtn.addEventListener('click', closeViewer);
    muteBtn.addEventListener('click', toggleMute);
    v.querySelector('#storyTapPrev').addEventListener('click', () => navigate(-1));
    v.querySelector('#storyTapNext').addEventListener('click', () => navigate(1));

    /* Keyboard */
    document.addEventListener('keydown', onKeyDown);

    /* Touch / swipe */
    card.addEventListener('touchstart', onTouchStart, { passive: true });
    card.addEventListener('touchend',   onTouchEnd,   { passive: true });

    /* Hold to pause (long press on tap zones) */
    const prev = v.querySelector('#storyTapPrev');
    const next = v.querySelector('#storyTapNext');
    [prev, next].forEach(zone => {
      zone.addEventListener('pointerdown', pauseProgress);
      zone.addEventListener('pointerup',   resumeProgress);
      zone.addEventListener('pointerleave', resumeProgress);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     OPEN / CLOSE
  ═══════════════════════════════════════════════════════════ */
  async function openViewer () {
    buildDOM();
    showLoading(true);
    showEmpty(false);
    showError(false);
    viewer.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Support admin preview override
    if (window._storyPreviewOverride) {
      stories = window._storyPreviewOverride;
      showLoading(false);
      buildProgressBars();
      currentIndex = 0;
      loadStory(currentIndex);
      return;
    }

    try {
      const res  = await fetch(API_STORIES);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      stories = data.stories || [];
    } catch (err) {
      console.warn('[Stories] fetch error:', err);
      stories = [];
    }

    showLoading(false);

    if (!stories.length) {
      showEmpty(true);
      return;
    }

    buildProgressBars();
    currentIndex = 0;
    loadStory(currentIndex);
  }

  function closeViewer () {
    cancelTimer();
    if (currentMedia) {
      currentMedia.pause?.();
      currentMedia = null;
    }
    viewer.classList.remove('open');
    document.body.style.overflow = '';
    // Reset for next open
    stories = [];
    mediaRetries = 0;
    progressWrap.innerHTML  = '';
    mediaContainer.innerHTML = '';
    showEmpty(false);
    showError(false);
  }

  /* ═══════════════════════════════════════════════════════════
     PROGRESS BARS
  ═══════════════════════════════════════════════════════════ */
  function buildProgressBars () {
    progressWrap.innerHTML = stories
      .map((_, i) => `
        <div class="story-progress-bar" id="spb-${i}" data-i="${i}">
          <div class="story-progress-fill" id="spf-${i}"></div>
        </div>
      `)
      .join('');
  }

  function resetProgressBars () {
    stories.forEach((_, i) => {
      const bar  = document.getElementById(`spb-${i}`);
      const fill = document.getElementById(`spf-${i}`);
      if (!bar || !fill) return;
      bar.classList.remove('done', 'active');
      fill.style.width = '0%';
      if (i < currentIndex)  { bar.classList.add('done');   fill.style.width = '100%'; }
      if (i === currentIndex)  bar.classList.add('active');
    });
  }

  /* ═══════════════════════════════════════════════════════════
     LOAD STORY
  ═══════════════════════════════════════════════════════════ */
  function loadStory (index) {
    cancelTimer();
    showError(false);

    if (index < 0 || index >= stories.length) {
      closeViewer();
      return;
    }

    currentIndex = index;
    mediaRetries = 0;
    const story  = stories[currentIndex];

    /* Validate story has a media URL */
    if (!story || !story.mediaUrl) {
      console.warn('[Stories] Story missing mediaUrl, skipping:', story);
      handleMediaError(story, false);
      return;
    }

    /* Update counter */
    counterEl.textContent = `${currentIndex + 1} / ${stories.length}`;

    /* Update time-ago */
    document.getElementById('storyTimeAgo').textContent = timeAgo(story.createdAt);

    /* Update caption */
    captionEl.textContent = story.caption || '';
    captionEl.style.display = story.caption ? '' : 'none';

    /* Update CTA */
    if (story.ctaLink && story.ctaText) {
      ctaEl.href = story.ctaLink;
      document.getElementById('storyCtaText').textContent = story.ctaText;
      ctaEl.style.display = 'inline-flex';
    } else {
      ctaEl.style.display = 'none';
    }

    /* Reset bars */
    resetProgressBars();

    /* Clear previous media */
    mediaContainer.innerHTML = '';
    currentMedia = null;

    /* Ping view count */
    pingView(story._id);

    /* Load media */
    if (story.type === 'video') {
      loadVideo(story);
    } else {
      loadImage(story);
    }
  }

  /* ── Image story ─────────────────────────────────────────── */
  function loadImage (story) {
    showLoading(true);
    const img  = document.createElement('img');
    img.className = 'story-media story-media-fade';
    img.alt       = story.caption || 'SHENOVA Story';
    img.loading   = 'eager';

    img.onload = () => {
      showLoading(false);
      showError(false);
      mediaContainer.appendChild(img);
      currentMedia = img;
      duration = STORY_DURATION_MS;
      startProgress();
    };

    img.onerror = () => {
      showLoading(false);
      handleMediaError(story, true);
    };

    img.src = story.mediaUrl;
  }

  /* ── Video story ─────────────────────────────────────────── */
  function loadVideo (story) {
    showLoading(true);
    const vid = document.createElement('video');
    vid.className    = 'story-media video-story story-media-fade';
    vid.autoplay     = true;
    vid.playsinline  = true;
    vid.muted        = muted;
    vid.loop         = false;
    vid.preload      = 'auto';

    vid.addEventListener('loadeddata', () => {
      showLoading(false);
      showError(false);
      mediaContainer.appendChild(vid);
      currentMedia = vid;
      vid.play().catch(() => {
        // Autoplay blocked — start progress anyway (muted should work)
        vid.muted = true;
        vid.play().catch(() => {});
      });
      duration = Math.min((vid.duration || 6) * 1000, VIDEO_MAX_MS);
      startProgress();
    }, { once: true });

    vid.addEventListener('ended', () => navigate(1), { once: true });

    vid.onerror = () => {
      showLoading(false);
      handleMediaError(story, true);
    };

    vid.src = story.mediaUrl;
  }

  /* ── Media error handler ─────────────────────────────────── */
  // Does NOT auto-close the viewer. Shows error state and lets user
  // manually skip, or auto-advances only if there are more stories.
  function handleMediaError (story, canSkip) {
    console.warn('[Stories] Media load failed for story:', story?._id, story?.mediaUrl);

    const hasNext = currentIndex < stories.length - 1;
    const hasPrev = currentIndex > 0;

    if (canSkip && stories.length > 1) {
      // There are other stories — auto-advance after brief pause so
      // the viewer doesn't flash/close without the user noticing.
      showError(true);
      setTimeout(() => {
        showError(false);
        if (hasNext) {
          navigate(1);
        } else if (hasPrev) {
          // On the last story; just show error state; user can close
          startFallbackTimer();
        } else {
          closeViewer();
        }
      }, 1500);
    } else {
      // Only 1 story and it failed — show error state, DO NOT close
      showError(true);
      // Still set a fallback so the viewer doesn't hang forever
      startFallbackTimer();
    }
  }

  /* Fallback timer used when no media loads (shows error state, then closes) */
  function startFallbackTimer () {
    cancelTimer();
    timer = setTimeout(() => { closeViewer(); }, 8000);
  }

  /* ═══════════════════════════════════════════════════════════
     PROGRESS ANIMATION (rAF-based for smoothness)
  ═══════════════════════════════════════════════════════════ */
  function startProgress () {
    cancelTimer();
    paused    = false;
    startTime = null;

    const fill = document.getElementById(`spf-${currentIndex}`);
    if (!fill) return;

    function tick (ts) {
      if (paused) { timer = requestAnimationFrame(tick); return; }
      if (!startTime) startTime = ts;

      const elapsed = ts - startTime;
      const pct     = Math.min((elapsed / duration) * 100, 100);
      fill.style.width = pct + '%';

      if (pct < 100) {
        timer = requestAnimationFrame(tick);
      } else {
        navigate(1);
      }
    }

    timer = requestAnimationFrame(tick);
  }

  function cancelTimer () {
    if (timer) {
      // cancel both rAF and setTimeout handles
      cancelAnimationFrame(timer);
      clearTimeout(timer);
      timer = null;
    }
    startTime = null;
  }

  function pauseProgress () {
    paused = true;
    currentMedia?.pause?.();
  }

  function resumeProgress () {
    paused = false;
    if (currentMedia?.paused) currentMedia.play().catch(() => {});
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION
  ═══════════════════════════════════════════════════════════ */
  function navigate (dir) {
    const next = currentIndex + dir;
    if (next < 0 || next >= stories.length) {
      closeViewer();
      return;
    }
    loadStory(next);
  }

  /* ═══════════════════════════════════════════════════════════
     MUTE / UNMUTE
  ═══════════════════════════════════════════════════════════ */
  function toggleMute () {
    muted = !muted;
    if (currentMedia && currentMedia.tagName === 'VIDEO') {
      currentMedia.muted = muted;
    }
    muteBtn.innerHTML = muted ? iconMuted() : iconUnmuted();
  }

  /* ═══════════════════════════════════════════════════════════
     KEYBOARD
  ═══════════════════════════════════════════════════════════ */
  function onKeyDown (e) {
    if (!viewer?.classList.contains('open')) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
    if (e.key === 'Escape')     { closeViewer(); }
    if (e.key === 'm')          { toggleMute(); }
  }

  /* ═══════════════════════════════════════════════════════════
     SWIPE
  ═══════════════════════════════════════════════════════════ */
  function onTouchStart (e) {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    touchStartT = Date.now();
    pauseProgress();
  }

  function onTouchEnd (e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartT;

    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) navigate(1);
      else         navigate(-1);
      return;
    }

    if (dt < 250) {
      resumeProgress();
      return;
    }

    resumeProgress();
  }

  /* ═══════════════════════════════════════════════════════════
     LOADING / EMPTY / ERROR STATE HELPERS
  ═══════════════════════════════════════════════════════════ */
  function showLoading (show) {
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
  }

  function showEmpty (show) {
    if (emptyEl) emptyEl.style.display = show ? 'flex' : 'none';
  }

  function showError (show) {
    if (errorEl) errorEl.style.display = show ? 'flex' : 'none';
  }

  /* ═══════════════════════════════════════════════════════════
     PING VIEW COUNT
  ═══════════════════════════════════════════════════════════ */
  function pingView (id) {
    if (!id) return;
    fetch(`${API_STORIES}/${id}/view`, { method: 'POST' }).catch(() => {});
  }

  /* ═══════════════════════════════════════════════════════════
     ICONS (inline SVG)
  ═══════════════════════════════════════════════════════════ */
  function iconMuted () {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>`;
  }

  function iconUnmuted () {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
    </svg>`;
  }

  function iconClose () {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
  }

  function iconArrow () {
    return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>`;
  }

  /* ═══════════════════════════════════════════════════════════
     TIME AGO
  ═══════════════════════════════════════════════════════════ */
  function timeAgo (dateStr) {
    if (!dateStr) return 'Now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const h    = Math.floor(diff / 3_600_000);
    const m    = Math.floor(diff / 60_000);
    if (h >= 1)  return `${h}h ago`;
    if (m >= 1)  return `${m}m ago`;
    return 'Just now';
  }

  /* ═══════════════════════════════════════════════════════════
     NAVBAR BUBBLE INIT
  ═══════════════════════════════════════════════════════════ */
  async function initBubble () {
    const logo = document.querySelector('.nav-logo, .lux-logo');
    if (!logo) return;

    const wrap = document.createElement('div');
    wrap.className    = 'story-bubble-wrap';
    wrap.id           = 'storyBubbleWrap';
    wrap.title        = 'Stories';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'Open SHENOVA Stories');

    wrap.innerHTML = `
<div class="story-bubble">
  <div class="story-bubble-inner">
    <img src="images/logo.png" class="story-logo-img" alt="Shenova">
  </div>
</div>
<span class="story-new-dot" id="storyNewDot" aria-hidden="true"></span>
<span class="story-tooltip">Stories</span>
`;

    logo.insertAdjacentElement('afterend', wrap);

    wrap.addEventListener('click', openViewer);
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(); }
    });

    /* Show glow ring only if active stories exist */
    try {
      const res  = await fetch(API_STORIES);
      if (!res.ok) return;
      const data = await res.json();
      if (data.stories && data.stories.length > 0) {
        wrap.classList.add('has-stories');
      }
    } catch {}
  }

  /* ═══════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════ */
  function init () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBubble);
    } else {
      initBubble();
    }
  }

  /* Expose for use in admin preview */
  global.SHStories = {
    open        : openViewer,
    close       : closeViewer,
    skipCurrent : () => {
      showError(false);
      navigate(1);
    },
  };

  init();

}(window));