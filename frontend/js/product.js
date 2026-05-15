const id = new URLSearchParams(location.search).get('id');
let product = null;
let currentImg = 0;
let selectedSize = null, selectedColor = null;

async function loadProduct(){
  try{
    const r = await fetch(API+'/products/'+id);
    if (!r.ok) throw 0;
    product = await r.json();
  }catch{
    product = sampleProducts().find(p => p.id===id) || sampleProducts()[0];
  }
  render();
}

function imgUrl(s){ return s?.startsWith('http')?s:API_BASE+s; }

function render(){
  document.title = product.name + ' · Shenova';
  document.querySelector('#pdp-name').textContent = product.name;
  document.querySelector('#pdp-price').textContent = '₹'+product.price.toLocaleString();
  document.querySelector('#pdp-desc').textContent = product.description || 'Crafted with the finest fabrics for an effortless silhouette.';
  document.querySelector('#pdp-main-img').src = imgUrl(product.images[0]);
  document.querySelector('#pdp-thumbs').innerHTML = product.images.map((im,i)=>
    `<img src="${imgUrl(im)}" class="${i===0?'active':''}" onclick="setImg(${i})">`).join('');
  document.querySelector('#pdp-sizes').innerHTML = (product.sizes||['XS','S','M','L']).map(s=>
    `<button class="size" onclick="setSize('${s}',this)">${s}</button>`).join('');
  const colors = product.colors||[];
  document.querySelector('#pdp-colors-wrap').style.display = colors.length?'block':'none';
  document.querySelector('#pdp-colors').innerHTML = colors.map(c=>
    `<button class="color" style="background:${c}" onclick="setColor('${c}',this)"></button>`).join('');
  loadRelated();
}

window.setImg = i => {
  currentImg = i;
  document.querySelector('#pdp-main-img').src = imgUrl(product.images[i]);
  document.querySelectorAll('#pdp-thumbs img').forEach((t,k)=>t.classList.toggle('active',k===i));
};
window.nextImg = () => setImg((currentImg+1) % product.images.length);
window.prevImg = () => setImg((currentImg-1+product.images.length) % product.images.length);
window.setSize = (s, el) => {
  selectedSize = s;
  document.querySelectorAll('#pdp-sizes .size').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
};
window.setColor = (c, el) => {
  selectedColor = c;
  document.querySelectorAll('#pdp-colors .color').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
};

window.addToCart = () => {
  if (!selectedSize) { showModal('Select your size', 'Please select a size before adding to bag.'); return; }
  const cart = JSON.parse(localStorage.getItem('cart')||'[]');
  cart.push({ id: product._id||product.id, name: product.name, price: product.price,
    image: imgUrl(product.images[0]), size: selectedSize, color: selectedColor, qty: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  openCart();
};

window.toggleWish = () => {
  const w = JSON.parse(localStorage.getItem('wishlist')||'[]');
  const id = product._id||product.id;
  const i = w.indexOf(id);
  if (i>-1) w.splice(i,1); else w.push(id);
  localStorage.setItem('wishlist', JSON.stringify(w));
  document.querySelector('#pdp-wish').classList.toggle('active');
};

// Image zoom
document.querySelector('#pdp-main-img')?.addEventListener('click', e => e.target.classList.toggle('zoom'));

async function loadRelated(){
  const wrap = document.querySelector('#related');
  if (!wrap) return;
  try{
    const r = await fetch(API+'/products');
    let list = await r.json();
    if (!list.length) list = sampleProducts();
    list = list.filter(p => (p._id||p.id) !== (product._id||product.id)).slice(0,4);
    wrap.innerHTML = list.map(productCard).join('');
  }catch{ wrap.innerHTML = sampleProducts().slice(0,4).map(productCard).join(''); }
}

loadProduct();
flyToCart(document.querySelector('.pdp-main-image'));
onclick="event.preventDefault(); addToCart(...); flyToCart(this.closest('.card').querySelector('img'))"