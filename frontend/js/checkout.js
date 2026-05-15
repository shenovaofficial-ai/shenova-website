function renderSummary(){
  const cart = JSON.parse(localStorage.getItem('cart')||'[]');

  const wrap = document.querySelector('#summary-items');

  if (!cart.length){
    wrap.innerHTML='<p>Your bag is empty.</p>';
    return;
  }

  wrap.innerHTML = cart.map(it=>`

    <div style="display:flex;gap:12px;margin-bottom:14px">

      <img src="${
        it.image?.startsWith('http')
        ? it.image
        : API_BASE + it.image
      }"

      style="
      width:60px;
      height:80px;
      object-fit:cover;
      border-radius:6px">

      <div style="flex:1">

        <div style="font-size:14px">
          ${it.name}
        </div>

        <div style="font-size:12px;color:#888">
          ${it.size} · Qty ${it.qty}
        </div>

      </div>

      <div style="font-size:14px">

        ₹${(it.price*it.qty).toLocaleString()}

      </div>

    </div>

  `).join('');

  const sub =
  cart.reduce((s,i)=>s+i.price*i.qty,0);

  const ship =
  sub>2000 ? 0 : 69;

  document.querySelector('#sub').textContent =
  '₹'+sub.toLocaleString();

  document.querySelector('#ship').textContent =
  ship ? '₹'+ship : 'Free';

  document.querySelector('#tot').textContent =
  '₹'+(sub+ship).toLocaleString();
}

renderSummary();

document
.querySelector('#checkout-form')
.addEventListener('submit', async e => {

  e.preventDefault();

  const f = e.target;

  const btn =
  f.querySelector('button');

  const cart =
  JSON.parse(
    localStorage.getItem('cart')||'[]'
  );

  if (!cart.length){

    alert(
      'Bag empty',
      'Add items before checking out.'
    );

    return;
  }

  const sub =
  cart.reduce((s,i)=>s+i.price*i.qty,0);

  const ship =
  sub>2000 ? 0 : 69;

  /* ================= COUPON ================= */

  let discountAmount = 0;

  if(f.coupon.value){

    try{

      const cr = await fetch(
        API + '/coupon/apply',
        {
          method:'POST',

          headers:{
            'Content-Type':'application/json'
          },

          body:JSON.stringify({
            coupon:f.coupon.value
          })
        }
      );

      const cd = await cr.json();

      if(!cr.ok){

        return alert(
          'Coupon Error',
          cd.message
        );

      }

      discountAmount =
      sub * (cd.discount / 100);

    }catch(err){

      return alert(
        'Error',
        'Coupon validation failed'
      );

    }

  }

  const body = {

    items: cart.map(i=>({

      name:i.name,
      image:i.image,
      price:i.price,
      size:i.size,
      color:i.color,
      qty:i.qty

    })),

    shipping: {

      fullName:f.fullName.value,
      email:f.email.value,
      phone:f.phone.value,
      address:f.address.value,
      city:f.city.value,
      state:f.state.value,
      zip:f.zip.value,
      country:f.country.value

    },

    paymentMethod:
    f.payment.value,

    coupon:
    f.coupon.value,

    subtotal:
    sub,

    shippingFee:
    ship,

    discount:
    discountAmount,

    total:
    (sub + ship) - discountAmount

  };

  /* ================= UX ================= */

  btn.textContent =
  "Placing Order...";

  btn.disabled = true;

  try{

    const r = await fetch(
      API+'/orders',
      {
        method:'POST',

        headers:{
          'Content-Type':'application/json'
        },

        body:JSON.stringify(body)
      }
    );

    if (!r.ok) throw 0;

    const res = await r.json();

    /* ================= MARK COUPON USED ================= */

    if(f.coupon.value){

      await fetch(
        API + '/coupon/use',
        {
          method:'POST',

          headers:{
            'Content-Type':'application/json'
          },

          body:JSON.stringify({
            coupon:f.coupon.value
          })
        }
      );

    }

    localStorage.removeItem('cart');

    updateCartCount();

    alert(
      'Order placed 🎉 Visit Again',
      'Your order has been successfully placed!'
    );

    setTimeout(()=>{

      document
      .querySelector('.modal button')
      ?.addEventListener('click',()=>{

        location.href = 'index.html';

      });

    },100);


  }catch(err){

    console.log(err);

    alert(
      'Order failed ❌',
      'Something went wrong. Please try again.'
    );

  }

  btn.textContent =
  "Place Order";

  btn.disabled = false;

});