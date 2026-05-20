// ================= GLOBAL CONFIG CHECK =================
/* ================= API CONFIG ================= */

const API_BASE =
  window.location.hostname.includes('localhost')
    ? 'http://localhost:5000'
    : 'https://shenova-backend.onrender.com';

const API = API_BASE + '/api';

// ================= LOADER =================
/* ================= LOADER ================= */


window.addEventListener('load', ()=>{

const loader = document.querySelector('.lux-loader'); 

  setTimeout(()=>{

loader?.classList.add('hide');

  }, 1800);

});

// ================= NAV =================
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 30);
});

// ================= MOBILE MENU =================
/* ================= FULLSCREEN MENU ================= */

const hamburger =
document.querySelector('.hamburger');

const mobileMenu =
document.querySelector('.mobile-menu');

hamburger?.addEventListener('click',()=>{

  hamburger.classList.toggle('active');

  mobileMenu.classList.toggle('open');

}); 

// ================= CART =================
function updateCartCount(){
  const cart = JSON.parse(localStorage.getItem('cart')||'[]');
  const c = cart.reduce((s,i)=>s+(i.qty||1),0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = c);
}
updateCartCount();

function openCart(){
  renderCart();
  document.querySelector('.drawer')?.classList.add('open');
  document.querySelector('.drawer-overlay')?.classList.add('open');
}
function closeCart(){
  document.querySelector('.drawer')?.classList.remove('open');
  document.querySelector('.drawer-overlay')?.classList.remove('open');
}
window.openCart = openCart;
window.closeCart = closeCart;

document.querySelector('.cart-btn')?.addEventListener('click', e => {
  e.preventDefault();
  openCart();
});

// ================= CART RENDER =================
function renderCart(){
  const cart = JSON.parse(localStorage.getItem('cart')||'[]');
  const body = document.querySelector('.drawer-body');
  const totalEl = document.querySelector('.drawer .total span:last-child');

  if (!body) return;

  if (!cart.length){
    body.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0">Your bag is empty</p>';
    if(totalEl) totalEl.textContent='₹0';
    return;
  }

  body.innerHTML = cart.map((it,i)=>{

    const raw = it.image || it.images?.[0] || '';
    const img = raw.startsWith('http') ? raw : API_BASE + raw;

    return `
    <div class="cart-item">
      <img src="${img}">
      <div>
        <h4>${it.name}</h4>
        <div class="meta">Size: ${it.size || '-'}${it.color?' · '+it.color:''}</div>
        <div class="qty">
          <button onclick="changeQty(${i},-1)">−</button>
          <span>${it.qty}</span>
          <button onclick="changeQty(${i},1)">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div>₹${(it.price*it.qty).toLocaleString()}</div>
        <button onclick="removeItem(${i})">REMOVE</button>
      </div>
    </div>`;
  }).join('');

  const total = cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  if (totalEl) totalEl.textContent = '₹'+total.toLocaleString();
}

// ================= CART ACTIONS =================
window.changeQty = (i,d) => {
  const c = JSON.parse(localStorage.getItem('cart')||'[]');
  c[i].qty = Math.max(1, (c[i].qty||1) + d);
  localStorage.setItem('cart', JSON.stringify(c));
  renderCart();
  updateCartCount();
};

window.removeItem = (i) => {
  const c = JSON.parse(localStorage.getItem('cart')||'[]');
  c.splice(i,1);
  localStorage.setItem('cart', JSON.stringify(c));
  renderCart();
  updateCartCount();
};

// ================= PRODUCTS =================
async function loadFeatured(retries = 3){

  const wrap = document.querySelector('#featured-grid');

  if (!wrap) return;

  // Luxury loading state
// Skeleton loading state
wrap.innerHTML = `

<div class="skeleton-grid">

  ${Array(4).fill().map(()=>`

    <div class="skeleton-card">

      <div class="skeleton-image"></div>

      <div class="skeleton-text"></div>

      <div class="skeleton-price"></div>

    </div>

  `).join('')}

</div>

`;

  try{

    const res = await fetch(API + '/products');

    if(!res.ok){
      throw new Error("Failed");
    }

    const products = await res.json();

    wrap.innerHTML = products
      .slice(0, 4)
      .map(p => productCard(p))
      .join('');

  }catch(err){

    console.log("Retrying product fetch...");

    if(retries > 0){

      setTimeout(() => {
        loadFeatured(retries - 1);
      }, 2000);

    }else{

      // Customer ko ugly error mat dikha
      wrap.innerHTML = `
        <div class="luxury-loading">
          Our collection is loading...
        </div>
      `;
    }
  }
}

function productCard(p){

  return `

  <div class="product-card">

    <a href="product.html?id=${p._id}">

      <div class="product-image">

  <img
    class="main-img"
    src="${
      p.images?.[0]?.startsWith('http')
      ? p.images[0]
      : API_BASE + p.images?.[0]
    }">

  ${
    p.images?.[1]
    ? `
    <img
      class="hover-img"
      src="${
        p.images[1]?.startsWith('http')
        ? p.images[1]
        : API_BASE + p.images[1]
      }">
    `
    : ''
  }

  <button
  class="quick-btn"
  onclick='openQuickView(event, ${JSON.stringify(p)})'>

    QUICK VIEW

  </button>

</div>

    </a>

    <div class="product-info">

      <div class="product-title">
        ${p.name}
      </div>

      <div class="product-price">
        ₹${p.price}
      </div>

    </div>

  </div>

  `;
}

loadFeatured();

// ================= ADD TO CART =================
function addToCart(product, imgEl){

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  const exists = cart.find(p => (p._id||p.id) === (product._id||product.id));

  if(exists){
    exists.qty += 1;
  } else {
    cart.push({
      ...product,
      qty:1,
      image: product.images?.[0] || ''
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));

  renderCart();
  openCart();
  updateCartCount();

  showToast("Added to bag 🛍️");
}

// ================= TOAST =================
function showToast(msg){
  alert(msg);
}

// ================= CONTACT =================
document.querySelector('#contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;

  const data = {
    name: form.name.value,
    email: form.email.value,
    message: form.message.value
  };

  try {
    await fetch(API_BASE + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    alert("Message sent ✅");
    form.reset();

  } catch {
    alert("Error ❌");
  }
});
/* ================= QUICK VIEW ================= */

let quickSelectedSize = null;

window.openQuickView = function(e, product){

  e.preventDefault();

  e.stopPropagation();

  const modal =
    document.getElementById('quick-modal');

  modal.classList.add('show');

  document.getElementById('quick-image').src =
    product.images?.[0]?.startsWith('http')
    ? product.images[0]
    : API_BASE + product.images?.[0];

  document.getElementById('quick-title')
    .textContent = product.name;

  document.getElementById('quick-price')
    .textContent = '₹' + product.price;

  document.getElementById('quick-desc')
    .textContent =
      product.description ||
      'Luxury fashion piece from Shenova.';

  const wrap =
    document.getElementById('quick-size-wrap');

  wrap.innerHTML = '';

  quickSelectedSize = null;

  (product.sizes || ['S','M','L'])
  .forEach(size=>{

    const btn =
      document.createElement('button');

    btn.className = 'size-pill';

    btn.textContent = size;

    btn.onclick = ()=>{

      document
      .querySelectorAll('.size-pill')
      .forEach(x=>x.classList.remove('active'));

      btn.classList.add('active');

      quickSelectedSize = size;
    };

    wrap.appendChild(btn);

  });

  document.getElementById('quick-cart-btn')
  .onclick = ()=>{

    if(!quickSelectedSize){

      return showModal(
        'Select Size',
        'Please select a size.'
      );
    }

    addToCart({
      ...product,
      size:quickSelectedSize,
      qty:1
    });

    closeQuickView();

    showModal(
      'Added to Bag',
      product.name + ' added successfully.'
    );

  };

}

window.closeQuickView = function(){

  document
  .getElementById('quick-modal')
  .classList.remove('show');

}
/* ================= REVEAL ================= */

const revealEls =
document.querySelectorAll('.reveal');

const revealObserver =
new IntersectionObserver(entries=>{

  entries.forEach(entry=>{

    if(entry.isIntersecting){

      entry.target.classList.add('active');

    }

  });

},{
  threshold:.12
});

revealEls.forEach(el=>{

  revealObserver.observe(el);

});
/* ================= GSAP ================= */

if(window.gsap){

  gsap.registerPlugin(ScrollTrigger);

  gsap.utils
  .toArray('.gsap-reveal')
  .forEach(el=>{

    gsap.to(el,{

      opacity:1,

      y:0,

      duration:1.4,

      ease:'power4.out',

      scrollTrigger:{
        trigger:el,
        start:'top 88%',
      }

    });

  });

}
/* ================= PAGE TRANSITIONS ================= */

/* PAGE ENTER */

window.addEventListener('pageshow',()=>{

  document.body.classList.remove(
    'page-out'
  );

  document.body.classList.add(
    'page-in'
  );

  setTimeout(()=>{

    document.body.classList.remove(
      'page-in'
    );

  },100);

});

/* PAGE LEAVE */

document
.querySelectorAll('a')
.forEach(link=>{

  const href =
  link.getAttribute('href');

  if(
    href &&
    !href.startsWith('#') &&
    !href.startsWith('javascript')
  ){

    link.addEventListener('click',e=>{

      e.preventDefault();

      document.body.classList.add(
        'page-out'
      );

      setTimeout(()=>{

        window.location = href;

      },700);

    });

  }

});
/* ================= SPIN WHEEL ================= */
/* NOTE: spinWheel(), closeSpinPopup(), closeCouponPopup(), copyCoupon()
   are all defined in the inline <script> at the bottom of index.html.
   This section intentionally left empty to avoid duplicate declarations. */
/* ================= NEWSLETTER ================= */

document
.querySelector('.newsletter-form')
?.addEventListener('submit', async e => {

  e.preventDefault();

  const email =
  document
  .getElementById('newsletter-email')
  .value
  .trim();

  if(!email){

    return alert(
      'Please enter email'
    );

  }

  try{

    const r = await fetch(

      API + '/newsletter',

      {

        method:'POST',

        headers:{
          'Content-Type':'application/json'
        },

        body:JSON.stringify({
          email
        })

      }

    );

    const data =
    await r.json();

    if(!r.ok){

      return alert(
        data.message ||
        'Something went wrong'
      );

    }

    alert(
      'Joined successfully 🎉'
    );

    document
    .getElementById('newsletter-email')
    .value = '';

  }catch(err){

    console.log(err);

    alert(
      'Server error'
    );

  }

});