/* ═══════════════════════════════════════
   PREMIUM SHIPPING MODAL FIX
   PASTE THIS INSIDE admin.shipping.js
   Replace ONLY injectShippingModal() function
═══════════════════════════════════════ */

function injectShippingModal() {
  if (document.getElementById('shipping-modal')) return;

  const html = `
    
  <style>

  #shipping-modal{
    position:fixed;
    inset:0;
    z-index:999999;
    display:none;
    align-items:center;
    justify-content:center;
    padding:20px;
  }

  #shipping-modal.active{
    display:flex;
  }

  .shipping-overlay{
    position:absolute;
    inset:0;
    background:rgba(0,0,0,.6);
    backdrop-filter:blur(8px);
  }

  .shipping-box{
    position:relative;
    width:min(680px,95%);
    background:#fff;
    border-radius:32px;
    overflow:hidden;
    z-index:2;
    animation:shipAnim .35s ease;
    box-shadow:0 30px 80px rgba(0,0,0,.18);
    font-family:Inter,sans-serif;
  }

  @keyframes shipAnim{
    from{
      opacity:0;
      transform:translateY(30px) scale(.96);
    }
    to{
      opacity:1;
      transform:none;
    }
  }

  .shipping-head{
    padding:28px 32px 20px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:1px solid #f1ede7;
  }

  .shipping-head-left{
    display:flex;
    gap:16px;
    align-items:center;
  }

  .shipping-icon{
    width:60px;
    height:60px;
    border-radius:20px;
    background:#f7f2eb;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
  }

  .shipping-title{
    font-size:34px;
    font-family:"Cormorant Garamond",serif;
  }

  .shipping-sub{
    font-size:13px;
    color:#888;
    margin-top:4px;
  }

  .shipping-close{
    width:46px;
    height:46px;
    border:none;
    border-radius:50%;
    background:#f5f5f5;
    cursor:pointer;
    font-size:18px;
  }

  .shipping-body{
    padding:30px 32px;
    display:flex;
    flex-direction:column;
    gap:20px;
  }

  .ship-field{
    display:flex;
    flex-direction:column;
    gap:8px;
  }

  .ship-field label{
    font-size:11px;
    letter-spacing:.16em;
    text-transform:uppercase;
    color:#888;
  }

  .ship-field input{
    width:100%;
    height:58px;
    border:1px solid #e7e2da;
    border-radius:18px;
    padding:0 18px;
    background:#fafafa;
    font-size:14px;
  }

  .ship-field input:focus{
    outline:none;
    border-color:#b8956a;
    background:#fff;
    box-shadow:0 0 0 4px rgba(184,149,106,.08);
  }

  .ship-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
  }

  .ship-note{
    background:#faf8f5;
    border:1px solid #eee7de;
    border-radius:18px;
    padding:16px;
    font-size:13px;
    color:#777;
    line-height:1.6;
  }

  .shipping-footer{
    padding:0 32px 32px;
    display:flex;
    justify-content:flex-end;
    gap:14px;
  }

  .ship-cancel{
    height:54px;
    padding:0 24px;
    border-radius:999px;
    border:1px solid #ddd;
    background:#fff;
    cursor:pointer;
    font-size:12px;
    letter-spacing:.16em;
    text-transform:uppercase;
  }

  .ship-confirm{
    height:54px;
    padding:0 28px;
    border:none;
    border-radius:999px;
    background:#111;
    color:#fff;
    cursor:pointer;
    font-size:12px;
    letter-spacing:.16em;
    text-transform:uppercase;
  }

  @media(max-width:768px){

    .shipping-box{
      width:95%;
      border-radius:24px;
    }

    .shipping-head,
    .shipping-body,
    .shipping-footer{
      padding-left:20px;
      padding-right:20px;
    }

    .ship-row{
      grid-template-columns:1fr;
    }

    .shipping-footer{
      flex-direction:column;
    }

    .ship-cancel,
    .ship-confirm{
      width:100%;
    }

    .shipping-title{
      font-size:28px;
    }
  }

  </style>

  <div id="shipping-modal">

    <div class="shipping-overlay" id="shipping-overlay"></div>

    <div class="shipping-box">

      <div class="shipping-head">

        <div class="shipping-head-left">

          <div class="shipping-icon">📦</div>

          <div>
            <div class="shipping-title">Mark as Shipped</div>
            <div class="shipping-sub">
              Enter courier and tracking details
            </div>
          </div>

        </div>

        <button class="shipping-close" id="shipping-close">
          ✕
        </button>

      </div>

      <div class="shipping-body">

        <div class="ship-field">
          <label>Courier Partner</label>
          <input id="sm-courier" type="text" placeholder="Delhivery / DTDC / Blue Dart">
        </div>

        <div class="ship-field">
          <label>Tracking ID</label>
          <input id="sm-tracking-id" type="text" placeholder="Tracking ID / AWB Number">
        </div>

        <div class="ship-row">

          <div class="ship-field">
            <label>Tracking URL</label>
            <input id="sm-tracking-url" type="text" placeholder="https://tracking-link.com">
          </div>

          <div class="ship-field">
            <label>Estimated Delivery</label>
            <input id="sm-est-date" type="date">
          </div>

        </div>

        <div class="ship-note">
          📧 A premium shipping confirmation email will automatically be sent to the customer with tracking details.
        </div>

      </div>

      <div class="shipping-footer">

        <button class="ship-cancel" id="shipping-cancel">
          Cancel
        </button>

        <button class="ship-confirm" id="shipping-confirm">
          Confirm Shipment
        </button>

      </div>

    </div>

  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  document
    .getElementById("shipping-overlay")
    .addEventListener("click", closeShippingModal);

  document
    .getElementById("shipping-close")
    .addEventListener("click", closeShippingModal);

  document
    .getElementById("shipping-cancel")
    .addEventListener("click", closeShippingModal);

  document
    .getElementById("shipping-confirm")
    .addEventListener("click", confirmShipment);
}