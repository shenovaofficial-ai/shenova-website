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

  if(email === 'admin@shenova.com'){
    localStorage.setItem('admin_token','demo');
    location.href = 'dashboard.html';
  } else {
    alert('Invalid admin credentials');
  }
};

window.logout = () => {
  localStorage.removeItem('admin_token');
  location.href = 'login.html';
};

// ================= DASHBOARD =================

async function loadDash(){

  if (!document.querySelector('#kpi-products')) return;

  const products = await api('/products');
  const orders = await api('/orders');

  document.querySelector('#kpi-products').textContent = products.length;

  document.querySelector('#kpi-orders').textContent = orders.length;

  document.querySelector('#kpi-revenue').textContent =
    '₹' + orders.reduce((s,o)=>s+(o.total||0),0).toLocaleString();

  document.querySelector('#kpi-pending').textContent =
    orders.filter(o=>o.status==='pending').length;

  // ================= PRODUCTS TABLE =================

  document.querySelector('#products-table tbody').innerHTML =
    products.map(p => `
      <tr>

        <td>
          <img 
            class="thumb"
            src="${
              p.images?.[0]
              ? (p.images[0].startsWith('http')
                  ? p.images[0]
                  : API_BASE + p.images[0])
              : ''
            }">
        </td>

        <td>${p.name}</td>

        <td>${p.category || '-'}</td>

        <td>₹${p.price}</td>

        <td>${p.stock}</td>

        <td>
          <div style="display:flex;gap:10px">

            <button 
  class="edit-btn"
  onclick="openEditModal('${p._id}')">
  EDIT
</button>

            <button 
              onclick="delProduct('${p._id}')">
              DELETE
            </button>

          </div>
        </td>

      </tr>
    `).join('');

  // ================= ORDERS =================

  document.querySelector('#orders-grid').innerHTML =
    orders.map(o => `
      <div class="order-card"
      onclick='openDrawer(${JSON.stringify(o)})'>

        <div class="order-top">

          <div>
            <div class="order-id">
              #${o._id.slice(-6)}
            </div>

            <div class="customer">
              ${o.shipping?.fullName || 'Unknown'}
            </div>
          </div>

          <div class="badge ${o.status}">
            ${o.status}
          </div>

        </div>

        <div class="order-meta">

          <div class="meta-box">
            <span>Total</span>
            ₹${o.total}
          </div>

          <div class="meta-box">
            <span>Phone</span>
            ${o.shipping?.phone || '-'}
          </div>

          <div class="meta-box">
            <span>City</span>
            ${o.shipping?.city || '-'}
          </div>

          <div class="meta-box">
            <span>Items</span>
            ${o.items?.length || 0}
          </div>

        </div>

      </div>
    `).join('');
}

// ================= ORDER DRAWER =================

window.openDrawer = (o) => {

  document.querySelector('#order-drawer')
    .classList.add('active');

  document.querySelector('#drawer-order-id')
    .textContent = '#' + o._id.slice(-6);

  document.querySelector('#drawer-body').innerHTML = `

    <div class="info-card">

      <h4>Customer Details</h4>

      <div class="info-row">
        <span>Name</span>
        <strong>${o.shipping?.fullName || '-'}</strong>
      </div>

      <div class="info-row">
        <span>Email</span>
        <strong>${o.shipping?.email || '-'}</strong>
      </div>

      <div class="info-row">
        <span>Phone</span>
        <strong>${o.shipping?.phone || '-'}</strong>
      </div>

    </div>

    <div class="info-card">

      <h4>Shipping Address</h4>

      <p>
        ${o.shipping?.address || ''}<br>
        ${o.shipping?.city || ''},
        ${o.shipping?.state || ''}<br>
        ${o.shipping?.zip || ''}
      </p>

      <button 
        onclick="navigator.clipboard.writeText('${o.shipping?.address || ''}')">
        Copy Address
      </button>

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

      `).join('')}

    </div>

    <div class="info-card">

      <h4>Order Controls</h4>

      <select onchange="updOrder('${o._id}',this.value)">

        ${['pending','processing','shipped','delivered','cancelled']
          .map(s => `
            <option ${o.status===s?'selected':''}>
              ${s}
            </option>
          `).join('')}

      </select>

    </div>
  `;
};

window.closeDrawer = () => {
  document.querySelector('#order-drawer')
    .classList.remove('active');
};

// ================= ADD PRODUCT =================

window.addProduct = async (e) => {

  e.preventDefault();

  const fd = new FormData(e.target);

  const r = await fetch(API + '/products', {
    method:'POST',
    body:fd
  });

  if(r.ok){

    alert('Product added ✅');

    e.target.reset();

    loadDash();

  } else {

    alert('Failed to add product ❌');
  }
};

// ================= DELETE PRODUCT =================

window.delProduct = async id => {

  if(confirm('Delete product?')){

    await api('/products/' + id, {
      method:'DELETE'
    });

    loadDash();
  }
};

// ================= UPDATE ORDER =================

window.updOrder = async (id,status) => {

  await api('/orders/' + id, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ status })
  });

  loadDash();
};

// ================= CONTACT MESSAGES =================

async function loadMessages(){

  try{

    const res = await fetch(API + '/contact');

    const data = await res.json();

    const wrap = document.querySelector('#messages-grid');

    if(!wrap) return;

    if(!data.length){

      wrap.innerHTML = '<p>No messages yet</p>';

      return;
    }

    wrap.innerHTML = data.map(m => `
      <div class="msg-card">

        <strong>${m.name}</strong>

        <p>${m.email}</p>

        <p>${m.message}</p>

        <button onclick="deleteMsg('${m._id}')">
          Delete
        </button>

      </div>
    `).join('');

  }catch(err){

    console.log(err);
  }
}

async function deleteMsg(id){

  if(!confirm("Delete this message?")) return;

  await fetch(API + '/contact/' + id, {
    method: 'DELETE'
  });

  loadMessages();
}

// ================= EDIT PRODUCT MODAL =================

window.openEditModal = async function(id){

  const r = await fetch(API + '/products/' + id);

  const product = await r.json();

  const modal = document.getElementById('edit-modal');

  const form = document.getElementById('edit-form');

  modal.classList.add('show');

  form.id.value = product._id || '';

  form.name.value = product.name || '';

  form.category.value = product.category || '';

  form.price.value = product.price || '';

  form.stock.value = product.stock || '';

  form.sizes.value = (product.sizes || []).join(',');

  form.description.value = product.description || '';
}

window.closeEditModal = function(){

  document.getElementById('edit-modal')
    .classList.remove('show');
}

// ================= SAVE EDITED PRODUCT =================

document.getElementById('edit-form')
.addEventListener('submit', async (e) => {

  e.preventDefault();

  const form = e.target;

  const fd = new FormData(form);

  const id = form.id.value;

  try{

    const r = await fetch(API + '/products/' + id, {
      method:'PUT',
      body:fd
    });

    if(!r.ok){
      throw new Error('Update failed');
    }

    alert('Product updated ✅');

    closeEditModal();

    loadDash();

  }catch(err){

    console.log(err);

    alert('Update failed ❌');
  }

});

// ================= INIT =================

loadDash();

loadMessages();