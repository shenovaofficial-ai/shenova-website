/* ================================================================
   admin-spin-leads.js  —  Spin Leads section for Admin Dashboard

   Add this script AFTER admin.js and config.js in dashboard.html

   Features:
   • Loads all spin leads from GET /api/admin/spin-leads
   • Search by name / email / phone / coupon
   • Filter by status (all / active / used / expired)
   • Pagination (50 per page)
   • Auto-refresh every 30 seconds
   • Delete lead
   • Mark as used / active
   • Real-time lead counter badge
   ================================================================ */

(function () {
  'use strict';

  /* ── State ────────────────────────────────────────────────── */
  let currentPage   = 1;
  let currentSearch = '';
  let currentStatus = 'all';
  let autoRefresh   = null;

  /* ── API call ─────────────────────────────────────────────── */
  async function fetchLeads(page = 1, search = '', status = 'all') {
    const params = new URLSearchParams({ page, limit: 50 });
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);

    try {
      const res  = await fetch(`${API}/admin/spin-leads?${params}`);
      if (!res.ok) throw new Error('API error ' + res.status);
      return await res.json();
    } catch (err) {
      console.error('[SpinLeads] Fetch error:', err);
      return { leads: [], total: 0, page: 1, pages: 1 };
    }
  }

  async function deleteLead(id) {
    if (!confirm('Delete this spin lead?')) return;
    try {
      const res = await fetch(`${API}/admin/spin-leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      renderSpinLeads();
    } catch (err) {
      alert('Failed to delete lead: ' + err.message);
    }
  }

  async function toggleUsed(id, currentUsed) {
    const newUsed   = !currentUsed;
    const newStatus = newUsed ? 'used' : 'active';
    try {
      const res = await fetch(`${API}/admin/spin-leads/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ used: newUsed, status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
      renderSpinLeads();
    } catch (err) {
      alert('Failed to update lead: ' + err.message);
    }
  }

  /* ── Format date ──────────────────────────────────────────── */
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  /* ── Status badge HTML ────────────────────────────────────── */
  function statusBadge(lead) {
    const map = {
      active:  { bg: '#e7f7ee', color: '#067647', label: 'Active'  },
      used:    { bg: '#ffe8e8', color: '#b42318', label: 'Used'    },
      expired: { bg: '#f0f0f0', color: '#666',    label: 'Expired' }
    };
    const s = map[lead.status] || map.active;
    return `<span class="sl-badge" style="background:${s.bg};color:${s.color}">${s.label}</span>`;
  }

  /* ── Render table ─────────────────────────────────────────── */
  async function renderSpinLeads() {
    const wrap = document.getElementById('spin-leads-wrap');
    if (!wrap) return;

    wrap.innerHTML = '<div class="sl-loading">Loading spin leads…</div>';

    const { leads, total, page, pages } = await fetchLeads(
      currentPage, currentSearch, currentStatus
    );

    // Update badge counter in sidebar / tab
    const badge = document.getElementById('spin-leads-count');
    if (badge) badge.textContent = total;

    if (!leads.length) {
      wrap.innerHTML = '<div class="sl-empty">No spin leads found.</div>';
      return;
    }

    wrap.innerHTML = `
      <div class="sl-meta">
        Showing <strong>${leads.length}</strong> of <strong>${total}</strong> leads
        ${pages > 1 ? `— Page ${page} of ${pages}` : ''}
      </div>

      <div class="sl-table-wrap">
        <table class="sl-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Prize</th>
              <th>Coupon</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map((lead, idx) => `
              <tr class="sl-row ${lead.used ? 'sl-used' : ''}">
                <td class="sl-num">${(page - 1) * 50 + idx + 1}</td>
                <td>${lead.name || '<span class="sl-na">—</span>'}</td>
                <td class="sl-email">${lead.email || '—'}</td>
                <td>${lead.phone || '<span class="sl-na">—</span>'}</td>
                <td><strong>${lead.prize || (lead.discount ? lead.discount + '% OFF' : '—')}</strong></td>
                <td>
                  <span class="sl-coupon">${lead.coupon || '—'}</span>
                  ${lead.coupon ? `<button class="sl-copy" onclick="navigator.clipboard.writeText('${lead.coupon}').then(()=>showCopyFlash(this))" title="Copy">⧉</button>` : ''}
                </td>
                <td class="sl-date">${fmtDate(lead.createdAt)}</td>
                <td>${statusBadge(lead)}</td>
                <td>
                  <div class="sl-actions">
                    <button class="sl-toggle ${lead.used ? 'sl-mark-active' : 'sl-mark-used'}"
                      onclick="window._slToggle('${lead._id}', ${lead.used})">
                      ${lead.used ? 'Mark Active' : 'Mark Used'}
                    </button>
                    <button class="sl-del" onclick="window._slDelete('${lead._id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${pages > 1 ? `
        <div class="sl-pagination">
          ${page > 1 ? `<button onclick="window._slPage(${page - 1})">← Prev</button>` : ''}
          <span>Page ${page} / ${pages}</span>
          ${page < pages ? `<button onclick="window._slPage(${page + 1})">Next →</button>` : ''}
        </div>
      ` : ''}
    `;
  }

  /* ── Flash feedback on copy ───────────────────────────────── */
  window.showCopyFlash = function (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓';
    btn.style.color = '#067647';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
  };

  /* ── Public action hooks ──────────────────────────────────── */
  window._slDelete = deleteLead;
  window._slToggle = toggleUsed;
  window._slPage   = function (p) {
    currentPage = p;
    renderSpinLeads();
    document.getElementById('spin-leads-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Build the Spin Leads section HTML ────────────────────── */
  function buildSpinLeadsSection() {
    const container = document.getElementById('spin-leads-section');
    if (!container) return;

    container.innerHTML = `
      <!-- Controls row -->
      <div class="sl-controls">
        <input
          id="sl-search"
          class="sl-search-input"
          type="text"
          placeholder="Search by name, email, phone or coupon…"
          value="${currentSearch}"
        >
        <select id="sl-status-filter" class="sl-status-select">
          <option value="all"     ${currentStatus === 'all'     ? 'selected' : ''}>All Status</option>
          <option value="active"  ${currentStatus === 'active'  ? 'selected' : ''}>Active</option>
          <option value="used"    ${currentStatus === 'used'    ? 'selected' : ''}>Used</option>
          <option value="expired" ${currentStatus === 'expired' ? 'selected' : ''}>Expired</option>
        </select>
        <button id="sl-refresh-btn" onclick="renderSpinLeads()" title="Refresh">↻ Refresh</button>
      </div>

      <!-- Table area -->
      <div id="spin-leads-wrap"></div>
    `;

    // Search debounce
    let debounce;
    document.getElementById('sl-search').addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage   = 1;
        renderSpinLeads();
      }, 400);
    });

    // Status filter
    document.getElementById('sl-status-filter').addEventListener('change', (e) => {
      currentStatus = e.target.value;
      currentPage   = 1;
      renderSpinLeads();
    });
  }

  /* ── Inject CSS ───────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('sl-styles')) return;
    const style = document.createElement('style');
    style.id = 'sl-styles';
    style.textContent = `
      /* ── Spin Leads Section ─────────────────────────────── */
      #spin-leads-section { }

      .sl-controls {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        align-items: center;
      }

      .sl-search-input {
        flex: 1;
        min-width: 220px;
        padding: 11px 16px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        font-size: 13px;
        background: #fafafa;
        font-family: inherit;
        margin-bottom: 0;
      }

      .sl-status-select {
        padding: 11px 16px;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        font-size: 13px;
        background: #fafafa;
        font-family: inherit;
        cursor: pointer;
        margin-bottom: 0;
        width: auto;
      }

      #sl-refresh-btn {
        padding: 11px 20px;
        border: none;
        background: #111;
        color: #fff;
        border-radius: 12px;
        font-size: 13px;
        cursor: pointer;
        letter-spacing: .08em;
        white-space: nowrap;
      }

      .sl-loading, .sl-empty {
        text-align: center;
        padding: 48px 0;
        color: #999;
        font-size: 14px;
        letter-spacing: .08em;
      }

      .sl-meta {
        font-size: 12px;
        color: #888;
        margin-bottom: 14px;
        letter-spacing: .06em;
      }

      .sl-table-wrap {
        overflow-x: auto;
        border-radius: 16px;
        border: 1px solid #eee;
      }

      .sl-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .sl-table thead th {
        background: #fafafa;
        padding: 13px 16px;
        font-size: 10px;
        letter-spacing: .2em;
        text-transform: uppercase;
        color: #888;
        text-align: left;
        border-bottom: 1px solid #eee;
        white-space: nowrap;
      }

      .sl-table tbody tr {
        border-bottom: 1px solid #f5f5f5;
        transition: background .15s;
      }

      .sl-table tbody tr:last-child {
        border-bottom: none;
      }

      .sl-table tbody tr:hover {
        background: #faf9f7;
      }

      .sl-table td {
        padding: 13px 16px;
        vertical-align: middle;
        border: none;
      }

      .sl-num {
        color: #bbb;
        font-size: 11px;
        width: 32px;
      }

      .sl-email {
        font-size: 12px;
        color: #555;
      }

      .sl-date {
        font-size: 11px;
        color: #888;
        white-space: nowrap;
      }

      .sl-coupon {
        font-family: monospace;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: .08em;
        background: #f5f5f5;
        padding: 3px 8px;
        border-radius: 6px;
      }

      .sl-copy {
        background: none;
        border: none;
        cursor: pointer;
        color: #aaa;
        font-size: 14px;
        padding: 2px 4px;
        border-radius: 4px;
        margin-left: 4px;
        transition: color .2s;
        letter-spacing: 0;
        text-transform: none;
      }

      .sl-copy:hover {
        color: #111;
      }

      .sl-badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .sl-na {
        color: #ccc;
      }

      .sl-used td {
        opacity: .65;
      }

      .sl-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .sl-toggle {
        font-size: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        letter-spacing: .12em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .sl-mark-used {
        background: #fff3e6;
        color: #9a6700;
      }

      .sl-mark-active {
        background: #e7f7ee;
        color: #067647;
      }

      .sl-del {
        font-size: 10px;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ffe8e8;
        color: #b42318;
        border: none;
        cursor: pointer;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .sl-pagination {
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: center;
        margin-top: 20px;
        font-size: 13px;
        color: #666;
      }

      .sl-pagination button {
        background: #f0f0f0;
        color: #111;
        border: none;
        padding: 9px 18px;
        border-radius: 999px;
        font-size: 12px;
        cursor: pointer;
        letter-spacing: .1em;
      }

      /* Sidebar badge */
      .sl-sidebar-badge {
        display: inline-block;
        background: #c0392b;
        color: #fff;
        border-radius: 999px;
        font-size: 10px;
        padding: 1px 7px;
        margin-left: 8px;
        vertical-align: middle;
        font-weight: 700;
      }

      @media (max-width: 768px) {
        .sl-controls {
          flex-direction: column;
        }
        .sl-search-input,
        .sl-status-select,
        #sl-refresh-btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Start auto-refresh (every 30s) ──────────────────────── */
  function startAutoRefresh() {
    if (autoRefresh) clearInterval(autoRefresh);
    autoRefresh = setInterval(() => {
      // Only refresh if the spin leads panel is visible
      const section = document.getElementById('spin-leads-section');
      if (section && section.offsetParent !== null) {
        renderSpinLeads();
      }
    }, 30_000);
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    injectStyles();
    buildSpinLeadsSection();
    renderSpinLeads();
    startAutoRefresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use (e.g. called from tab switches)
  window.renderSpinLeads = renderSpinLeads;

})();
