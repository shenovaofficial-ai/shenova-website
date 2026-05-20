/* ═══════════════════════════════════════════════════════════════
   SHENOVA · Admin Stories Manager
   File: js/adminStories.js

   Adds a "Stories" section to dashboard.html.
   Paste the HTML snippet into dashboard.html's sidebar + content area,
   then load this script at the bottom of dashboard.html.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Uses window.API set in dashboard.html */
  const STORY_API = window.API + '/stories';

  /* ── State ───────────────────────────────────────────────── */
  let allAdminStories  = [];
  let dragSrcIndex     = null;
  let editingStoryId   = null;

  /* ═══════════════════════════════════════════════════════════
     LOAD STORIES (admin — all + expired)
  ═══════════════════════════════════════════════════════════ */
  async function loadAdminStories () {
    const grid = document.getElementById('stories-admin-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="padding:24px;color:var(--muted);font-size:12px;letter-spacing:.18em;text-transform:uppercase">Loading stories…</div>';

    try {
      const res = await fetch(STORY_API);
      const data = await res.json();
      allAdminStories = data.stories || [];
    } catch {
      allAdminStories = [];
    }

    renderAdminGrid();
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER GRID
  ═══════════════════════════════════════════════════════════ */
  function renderAdminGrid () {
    const grid = document.getElementById('stories-admin-grid');
    if (!grid) return;

    if (!allAdminStories.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;padding:48px 24px;text-align:center">
          <div style="font-family:var(--serif);font-size:40px;color:var(--border-md);margin-bottom:12px">Stories</div>
          <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)">No stories uploaded yet</div>
        </div>`;
      return;
    }

    grid.innerHTML = allAdminStories.map((s, i) => storyCard(s, i)).join('');

    /* Drag-to-reorder */
    grid.querySelectorAll('.story-admin-card').forEach(attachDrag);
  }

  function storyCard (s, i) {
    const expired    = s.expired;
    const mediaHtml  = s.type === 'video'
      ? `<video class="story-admin-thumb" src="${s.mediaUrl}" muted playsinline preload="metadata"></video>`
      : `<img  class="story-admin-thumb" src="${s.mediaUrl}" alt="" loading="lazy">`;

    return `
    <div class="story-admin-card${expired ? ' expired' : ''}"
         draggable="true"
         data-id="${s._id}"
         data-i="${i}">

      ${mediaHtml}

      <div class="story-type-badge">${s.type}</div>

      <div class="story-admin-overlay">
        <div class="story-admin-expiry">${expired ? '⚠ Expired' : '⏱ ' + (s.expiresInLabel || '')}</div>
        ${s.caption ? `<div class="story-admin-caption">${s.caption}</div>` : ''}
        <div class="story-admin-actions">
          <button class="story-admin-btn" onclick="adminPreviewStory('${s._id}')">Preview</button>
          <button class="story-admin-btn" onclick="adminEditStory('${s._id}')">Edit</button>
          <button class="story-admin-btn danger" onclick="adminDeleteStory('${s._id}')">Delete</button>
        </div>
      </div>
    </div>`;
  }

  /* ═══════════════════════════════════════════════════════════
     DRAG-TO-REORDER
  ═══════════════════════════════════════════════════════════ */
  function attachDrag (card) {
    card.addEventListener('dragstart', e => {
      dragSrcIndex = +card.dataset.i;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.story-admin-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.story-admin-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });

    card.addEventListener('drop', async e => {
      e.preventDefault();
      const destIndex = +card.dataset.i;
      if (dragSrcIndex === null || dragSrcIndex === destIndex) return;

      /* Reorder local array */
      const moved = allAdminStories.splice(dragSrcIndex, 1)[0];
      allAdminStories.splice(destIndex, 0, moved);
      dragSrcIndex = null;

      /* Send to backend */
      try {
        const ids = allAdminStories.map(s => s._id);
        await fetch(STORY_API + '/reorder', {
          method  : 'PUT',
          headers : { 'Content-Type': 'application/json' },
          body    : JSON.stringify({ order: ids }),
        });
      } catch {
        toast('Reorder failed', 'error');
      }

      renderAdminGrid();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     UPLOAD STORY
  ═══════════════════════════════════════════════════════════ */
  window.adminUploadStory = async function (e) {
    e.preventDefault();
    const form    = e.target;
    const fileIn  = form.querySelector('#storyFileInput');
    const caption = form.querySelector('#storyAdminCaption').value.trim();
    const ctaText = form.querySelector('#storyAdminCtaText').value.trim();
    const ctaLink = form.querySelector('#storyAdminCtaLink').value.trim();

    if (!fileIn.files.length) {
      toast('Please select an image or video file.', 'error');
      return;
    }

    const btn = form.querySelector('#storyUploadBtn');
    const bar = form.querySelector('#storyUploadProgress');
    btn.disabled    = true;
    btn.textContent = 'Uploading…';
    if (bar) bar.style.display = 'block';

    const fd = new FormData();
    fd.append('storyFile', fileIn.files[0]);
    fd.append('caption',   caption);
    fd.append('ctaText',   ctaText);
    fd.append('ctaLink',   ctaLink);
    fd.append('order',     allAdminStories.length);

    try {
      const res  = await fetch(STORY_API, { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Upload failed');

      toast('Story uploaded ✓', 'success');
      form.reset();
      clearStoryPreview();
      loadAdminStories();

    } catch (err) {
      toast('Upload failed: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Upload Story';
      if (bar) bar.style.display = 'none';
    }
  };

  /* ═══════════════════════════════════════════════════════════
     DELETE STORY
  ═══════════════════════════════════════════════════════════ */
  window.adminDeleteStory = async function (id) {
    if (!confirm('Delete this story? This cannot be undone.')) return;

    try {
      const res  = await fetch(STORY_API + '/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast('Story deleted', 'success');
      loadAdminStories();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  };

  /* ═══════════════════════════════════════════════════════════
     PREVIEW STORY
  ═══════════════════════════════════════════════════════════ */
  window.adminPreviewStory = function (id) {
    /* Temporarily set stories to just this one and open viewer */
    const story = allAdminStories.find(s => s._id === id);
    if (!story) return;

    /* Use the public viewer in preview mode */
    if (window.SHStories) {
      /* Inject just this story then open */
      window._storyPreviewOverride = [story];
      window.SHStories.open();
      window._storyPreviewOverride = null;
    } else {
      window.open(story.mediaUrl, '_blank');
    }
  };

  /* ═══════════════════════════════════════════════════════════
     EDIT STORY (caption / CTA)
  ═══════════════════════════════════════════════════════════ */
  window.adminEditStory = function (id) {
    const story = allAdminStories.find(s => s._id === id);
    if (!story) return;
    editingStoryId = id;

    const modal = document.getElementById('storyEditModal');
    if (!modal) return;

    modal.querySelector('#editCaption').value  = story.caption  || '';
    modal.querySelector('#editCtaText').value  = story.ctaText  || '';
    modal.querySelector('#editCtaLink').value  = story.ctaLink  || '';
    modal.querySelector('#editOrder').value    = story.order    || 0;
    modal.classList.add('show');
  };

  window.adminCloseEditStory = function () {
    document.getElementById('storyEditModal')?.classList.remove('show');
    editingStoryId = null;
  };

  window.adminSaveEditStory = async function (e) {
    e.preventDefault();
    if (!editingStoryId) return;

    const form = e.target;
    const body = {
      caption : form.querySelector('#editCaption').value.trim(),
      ctaText : form.querySelector('#editCtaText').value.trim(),
      ctaLink : form.querySelector('#editCtaLink').value.trim(),
      order   : +form.querySelector('#editOrder').value || 0,
    };

    const btn = form.querySelector('#editSaveBtn');
    btn.disabled = true;

    try {
      const res  = await fetch(STORY_API + '/' + editingStoryId, {
        method  : 'PUT',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast('Story updated ✓', 'success');
      adminCloseEditStory();
      loadAdminStories();
    } catch (err) {
      toast('Update failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MANUAL CLEANUP
  ═══════════════════════════════════════════════════════════ */
  window.adminCleanupStories = async function () {
    if (!confirm('Delete all expired stories and their Cloudinary assets?')) return;
    try {
      const res  = await fetch(STORY_API + '/cleanup', { method: 'DELETE' });
      const data = await res.json();
      toast(`Cleaned up ${data.deleted} expired stories`, 'success');
      loadAdminStories();
    } catch {
      toast('Cleanup failed', 'error');
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MEDIA PREVIEW IN UPLOAD FORM
  ═══════════════════════════════════════════════════════════ */
  function initUploadPreview () {
    const input   = document.getElementById('storyFileInput');
    const preview = document.getElementById('storyFilePreview');
    if (!input || !preview) return;

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) { clearStoryPreview(); return; }

      const url  = URL.createObjectURL(file);
      const isVid = file.type.startsWith('video/');

      preview.innerHTML = isVid
        ? `<video src="${url}" class="story-preview-thumb" controls muted playsinline style="width:80px;aspect-ratio:9/16;object-fit:cover;border-radius:8px;margin-top:8px"></video>`
        : `<img src="${url}" class="story-preview-thumb" alt="Preview">`;
    });
  }

  function clearStoryPreview () {
    const preview = document.getElementById('storyFilePreview');
    if (preview) preview.innerHTML = '';
  }

  /* ═══════════════════════════════════════════════════════════
     TOAST (re-use dashboard's existing toast if present)
  ═══════════════════════════════════════════════════════════ */
  function toast (msg, type = '') {
    if (typeof window.toast === 'function') {
      window.toast(msg, type);
      return;
    }
    /* Fallback */
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) { alert(msg); return; }
    const el   = document.createElement('div');
    el.className = 'toast ' + type;
    const icons  = { success: '✓', error: '✕', info: 'ℹ' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || '●'}</span><span>${msg}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all .4s';
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }

  /* ═══════════════════════════════════════════════════════════
     REGISTER "stories" SECTION IN DASHBOARD NAV
  ═══════════════════════════════════════════════════════════ */
  function registerStoriesSection () {
    /* Patch showSection to know about 'stories' */
    const origShowSection = window.showSection;
    if (typeof origShowSection === 'function') {
      window.showSection = function (id) {
        origShowSection(id);
        if (id === 'stories') {
          loadAdminStories();
          initUploadPreview();
        }
      };

      /* Patch sectionTitles */
      if (window.sectionTitles) window.sectionTitles.stories = 'Stories';
    }
  }

  /* ═══════════════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    registerStoriesSection();
    initUploadPreview();

    /* If section already active on load */
    if (document.getElementById('section-stories')?.classList.contains('active')) {
      loadAdminStories();
    }
  });

}());