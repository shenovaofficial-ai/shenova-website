const token = localStorage.getItem('admin_token');

if (!token && !location.pathname.endsWith('login.html')) {
  location.href = 'login.html';
}

// ================= API =================

async function api(path, opts = {}) {
  try {
    const r = await fetch(API + path, opts);
    return await r.json();
  } catch (e) {
    console.log(e);
    return [];
  }
}

// ================= LOGIN =================

window.adminLogin = async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  if (email === 'admin@shenova.com') {
    localStorage.setItem('admin_token', 'demo');
    location.href = 'dashboard.html';
  } else {
    alert('Invalid admin credentials');
  }
};

window.logout = () => {
  localStorage.removeItem('admin_token');
  location.href = 'login.html';
};

// ================= MEDIA URL HELPER =================

function mediaUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : API_BASE + src;
}

function isVideo(src) {
  return /\.(mp4|webm|mov|avi|ogg)$/i.test(src);
}

// ================= DASHBOARD =================

async function loadDash() {
  if (!document.querySelector('#kpi-products')) return;

  const products = await api('/products');
  const orders   = await api('/orders');

  document.querySelector('#kpi-products').textContent = products.length;
  document.querySelector('#kpi-orders').textContent   = orders.length;
  document.querySelector('#kpi-revenue').textContent  =
    '₹' + orders.reduce((s, o) => s + (o.total || 0), 0).toLocaleString();
  document.querySelector('#kpi-pending').textContent  =
    orders.filter(o => o.status === 'pending').length;

  // ── Products table ────────────────────────────────────────────────
document.querySelector('#products-table tbody').innerHTML =
  products.map(p => {
    const firstMedia = (p.images?.[0]) || (p.videos?.[0]) || '';
    const thumbHtml = firstMedia
      ? isVideo(firstMedia)
        ? `<video class="thumb" src="${mediaUrl(firstMedia)}" muted playsinline preload="metadata"></video>`
        : `<img class="thumb" src="${mediaUrl(firstMedia)}" alt="">`
      : `<div class="thumb" style="background:#f0ede8"></div>`;
 
    const hasVideos = p.videos?.length > 0;
 
    /* ── STOCK MANAGEMENT ADDITION: colour-code the stock cell ── */
    const stockNum   = Number(p.stock) || 0;
    const stockClass = stockNum === 0
      ? 'stock-critical'          /* red  — out of stock   */
      : stockNum <= 3
        ? 'stock-warn'            /* amber — low stock     */
        : '';                     /* normal                */
 
    const stockLabel = stockNum === 0
      ? '⚠ Out of Stock'
      : stockNum <= 3
        ? `⚡ Only ${stockNum} left`
        : stockNum;
    /* ── END STOCK MANAGEMENT ADDITION ── */
 
    return `
      <tr>
        <td>${thumbHtml}</td>
        <td>
          ${p.name}
          ${hasVideos ? `<span class="media-badge">🎬 ${p.videos.length} video${p.videos.length > 1 ? 's' : ''}</span>` : ''}
        </td>
        <td>${p.category || '-'}</td>
        <td>₹${p.price}</td>
        <td class="${stockClass}">${stockLabel}</td>
        <td>
          <div style="display:flex;gap:10px">
            <button class="edit-btn" onclick="openEditModal('${p._id}')">EDIT</button>
            <button onclick="delProduct('${p._id}')">DELETE</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // ── Orders ────────────────────────────────────────────────────────
  document.querySelector('#orders-grid').innerHTML =
    orders.map(o => `
      <div class="order-card" onclick='openDrawer(${JSON.stringify(o)})'>
        <div class="order-top">
          <div>
            <div class="order-id">#${o._id.slice(-6)}</div>
            <div class="customer">${o.shipping?.fullName || 'Unknown'}</div>
          </div>
          <div class="badge ${o.status}">${o.status}</div>
        </div>
        <div class="order-meta">
          <div class="meta-box"><span>Total</span>₹${o.total}</div>
          <div class="meta-box"><span>Phone</span>${o.shipping?.phone || '-'}</div>
          <div class="meta-box"><span>City</span>${o.shipping?.city || '-'}</div>
          <div class="meta-box"><span>Items</span>${o.items?.length || 0}</div>
        </div>
      </div>
    `).join('');
}

// ================= ORDER DRAWER =================

window.openDrawer = (o) => {
  document.querySelector('#order-drawer').classList.add('active');
  document.querySelector('#drawer-order-id').textContent = '#' + o._id.slice(-6);
  document.querySelector('#drawer-body').innerHTML = `
    <div class="info-card">
      <h4>Customer Details</h4>
      <div class="info-row"><span>Name</span><strong>${o.shipping?.fullName || '-'}</strong></div>
      <div class="info-row"><span>Email</span><strong>${o.shipping?.email || '-'}</strong></div>
      <div class="info-row"><span>Phone</span><strong>${o.shipping?.phone || '-'}</strong></div>
    </div>
    <div class="info-card">
      <h4>Shipping Address</h4>
      <p>${o.shipping?.address || ''}<br>${o.shipping?.city || ''}, ${o.shipping?.state || ''}<br>${o.shipping?.zip || ''}</p>
      <button onclick="navigator.clipboard.writeText('${o.shipping?.address || ''}')">Copy Address</button>
    </div>
    <div class="info-card">
      <h4>Products Ordered</h4>
      ${(o.items || []).map(i => `
        <div class="product-item">
          <img src="${i.image}">
          <div>
            <h5>${i.name}</h5>
            <p>₹${i.price}</p>
            <p>Qty: ${i.qty || 1}</p>
            <p>Size: ${i.size || '-'}</p>
          </div>
        </div>
        ${i.customSize ? `
        <div class="custom-size-block">
          <div class="custom-size-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            Custom Bespoke Measurements
          </div>
          <div class="custom-size-grid">
            ${i.customSize.bust     ? `<div class="csm-item"><span>Bust</span><strong>${i.customSize.bust} cm</strong></div>` : ''}
            ${i.customSize.waist    ? `<div class="csm-item"><span>Waist</span><strong>${i.customSize.waist} cm</strong></div>` : ''}
            ${i.customSize.hip      ? `<div class="csm-item"><span>Hip</span><strong>${i.customSize.hip} cm</strong></div>` : ''}
            ${i.customSize.shoulder ? `<div class="csm-item"><span>Shoulder</span><strong>${i.customSize.shoulder} cm</strong></div>` : ''}
            ${i.customSize.length   ? `<div class="csm-item"><span>Length</span><strong>${i.customSize.length} cm</strong></div>` : ''}
            ${i.customSize.sleeve   ? `<div class="csm-item"><span>Sleeve</span><strong>${i.customSize.sleeve} cm</strong></div>` : ''}
          </div>
          ${i.customSize.notes ? `<div class="csm-notes-row"><span>Notes:</span> ${i.customSize.notes}</div>` : ''}
        </div>` : ''}
      `).join('')}
    </div>
    <div class="info-card">
      <h4>Order Controls</h4>
      <select onchange="updOrder('${o._id}', this.value)">
        ${['pending','processing','shipped','delivered','cancelled'].map(s =>
          `<option ${o.status === s ? 'selected' : ''}>${s}</option>`
        ).join('')}
      </select>
    </div>
  `;
};

window.closeDrawer = () => {
  document.querySelector('#order-drawer').classList.remove('active');
};

// ================= ADD PRODUCT =================

window.addProduct = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);

  // FormData already captures the "images" and "videos" file inputs
  // by their name attributes — nothing extra needed.

  const btn = e.target.querySelector('button[type="submit"], button:last-of-type');
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }

  try {
    const r = await fetch(API + '/products', { method: 'POST', body: fd });
    if (r.ok) {
      alert('Product added ✅');
      e.target.reset();
      resetMediaPreviews('add');
      loadDash();
    } else {
      const err = await r.json().catch(() => ({}));
      alert('Failed to add product ❌ ' + (err.error || ''));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Add Product'; }
  }
};

// ================= DELETE PRODUCT =================

window.delProduct = async (id) => {
  if (confirm('Delete product?')) {
    await api('/products/' + id, { method: 'DELETE' });
    loadDash();
  }
};

// ================= UPDATE ORDER =================

window.updOrder = async (id, status) => {
  await api('/orders/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  loadDash();
};

// ================= CONTACT MESSAGES =================

async function loadMessages() {
  try {
    const res  = await fetch(API + '/contact');
    const data = await res.json();
    const wrap = document.querySelector('#messages-grid');
    if (!wrap) return;

    if (!data.length) { wrap.innerHTML = '<p>No messages yet</p>'; return; }

    wrap.innerHTML = data.map(m => `
      <div class="msg-card">
        <strong>${m.name}</strong>
        <p>${m.email}</p>
        <p>${m.message}</p>
        <button onclick="deleteMsg('${m._id}')">Delete</button>
      </div>
    `).join('');
  } catch (err) {
    console.log(err);
  }
}

async function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  await fetch(API + '/contact/' + id, { method: 'DELETE' });
  loadMessages();
}

// ================= MEDIA PREVIEW HELPER =================

/**
 * Attach live preview behaviour to a pair of file inputs.
 * @param {string} context  'add' | 'edit'
 */
function attachMediaPreviews(context) {
  const imgInput   = document.getElementById(`${context}-images-input`);
  const vidInput   = document.getElementById(`${context}-videos-input`);
  const imgPreview = document.getElementById(`${context}-img-preview`);
  const vidPreview = document.getElementById(`${context}-vid-preview`);

  if (imgInput && imgPreview) {
    imgInput.addEventListener('change', () => {
      imgPreview.innerHTML = '';
      Array.from(imgInput.files).forEach(file => {
        const url = URL.createObjectURL(file);
        const el  = document.createElement('img');
        el.src    = url;
        el.className = 'preview-thumb';
        imgPreview.appendChild(el);
      });
    });
  }

  if (vidInput && vidPreview) {
    vidInput.addEventListener('change', () => {
      vidPreview.innerHTML = '';
      Array.from(vidInput.files).forEach(file => {
        const url = URL.createObjectURL(file);
        const el  = document.createElement('video');
        el.src    = url;
        el.controls = true;
        el.muted    = true;
        el.className = 'preview-thumb preview-video';
        vidPreview.appendChild(el);
      });
    });
  }
}

function resetMediaPreviews(context) {
  const imgPreview = document.getElementById(`${context}-img-preview`);
  const vidPreview = document.getElementById(`${context}-vid-preview`);
  if (imgPreview) imgPreview.innerHTML = '';
  if (vidPreview) vidPreview.innerHTML = '';
  // Also reset file inputs so re-opening doesn't show stale selections
  if (context === 'edit') {
    const imgInput = document.getElementById('edit-images-input');
    const vidInput = document.getElementById('edit-videos-input');
    if (imgInput) imgInput.value = '';
    if (vidInput) vidInput.value = '';
  }
}

// ================= EDIT PRODUCT MODAL =================

window.openEditModal = async function(id) {
  const modal = document.getElementById('edit-modal');
  const form  = document.getElementById('edit-form');

  // Show modal immediately with a loading state
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';

  let product;
  try {
    const r = await fetch(API + '/products/' + id);
    if (!r.ok) throw new Error('Failed to load product');
    product = await r.json();
  } catch (err) {
    alert('Could not load product details. Please try again.');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    return;
  }

  // Populate form fields
  form.id.value          = product._id || '';
  form.name.value        = product.name || '';
  form.category.value    = product.category || '';
  form.price.value       = product.price || '';
  form.stock.value       = product.stock || '';
  form.sizes.value       = (product.sizes || []).join(',');
  form.description.value = product.description || '';

  // ── Current images ───────────────────────────────────────
  const existImgWrap = document.getElementById('edit-existing-images');
  if (existImgWrap) {
    if (product.images?.length) {
      existImgWrap.innerHTML = product.images.map(src => `
        <img src="${mediaUrl(src)}" alt="Product image" loading="lazy">
      `).join('');
    } else {
      existImgWrap.innerHTML = '<span class="no-media-text">No images uploaded</span>';
    }
  }

  // ── Current videos ───────────────────────────────────────
  const existVidWrap = document.getElementById('edit-existing-videos');
  if (existVidWrap) {
    if (product.videos?.length) {
      existVidWrap.innerHTML = product.videos.map(src => `
        <video src="${mediaUrl(src)}" controls muted preload="metadata"></video>
      `).join('');
    } else {
      existVidWrap.innerHTML = '<span class="no-media-text">No videos uploaded</span>';
    }
  }

  // Clear new-file previews from any previous open
  resetMediaPreviews('edit');
};

window.closeEditModal = function() {
  document.getElementById('edit-modal').classList.remove('show');
  document.body.style.overflow = '';
};

// ================= SAVE EDITED PRODUCT =================

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd   = new FormData(form);
  const id   = form.id.value;

  const btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const r = await fetch(API + '/products/' + id, { method: 'PUT', body: fd });
    if (!r.ok) throw new Error('Update failed');
    alert('Product updated ✅');
    closeEditModal();
    loadDash();
  } catch (err) {
    console.log(err);
    alert('Update failed ❌');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
});

// ================= INIT =================

// Attach live preview listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  attachMediaPreviews('add');
  attachMediaPreviews('edit');
});

loadDash();
loadMessages();