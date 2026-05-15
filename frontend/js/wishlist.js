async function loadWish(){
  const ids = JSON.parse(localStorage.getItem('wishlist')||'[]');
  const wrap = document.querySelector('#wish-grid');
  if (!ids.length){ wrap.innerHTML='<p style="text-align:center;color:#888;padding:60px 0">No saved items yet.</p>'; return; }
  let all = [];
  try{ all = await (await fetch(API+'/products')).json(); }catch{ all = sampleProducts(); }
  if (!all.length) all = sampleProducts();
  const list = all.filter(p => ids.includes(p._id||p.id));
  wrap.innerHTML = list.map(productCard).join('') || '<p>Items unavailable.</p>';
}
loadWish();
