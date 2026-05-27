/* ================================================================
   templates/shippingEmailTemplates.js — SHENOVA Shipping Emails
   ================================================================
   ✅ CommonJS (require / module.exports) — no import/export
   ✅ Inline CSS only (Gmail / Apple Mail / Outlook compatible)
   ✅ Mobile responsive
   ✅ Four templates: Shipped, Out For Delivery, Delivered, Cancelled
   ✅ Luxury SHENOVA brand aesthetic
   ================================================================ */

'use strict';

/* ── Shared env fallbacks ─────────────────────────────────────── */
const FE_URL       = () => process.env.FRONTEND_URL  || 'https://shenovaofficial.com';
const SUPPORT_EMAIL= () => process.env.SUPPORT_EMAIL || 'shenova@shenovaofficial.com';
const SUPPORT_PHONE= () => process.env.SUPPORT_PHONE || '+91 70417 02391';
const IG_URL       = () => process.env.INSTAGRAM_URL || 'https://instagram.com/shenovaofficial';

/* ── Shared header HTML ───────────────────────────────────────── */
function emailHeader(accentLine = '') {
  return `
    <!-- HEADER -->
    <tr>
      <td style="
        background: #0a0a0a;
        padding: 36px 40px 30px;
        text-align: center;
      ">
        <div style="
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 32px;
          font-weight: 400;
          color: #ffffff;
          letter-spacing: 10px;
          text-transform: uppercase;
          margin-bottom: 6px;
        ">SHENOVA</div>
        <div style="
          font-family: Arial, sans-serif;
          font-size: 10px;
          color: #c8b89a;
          letter-spacing: 4px;
          text-transform: uppercase;
        ">LUXURY FASHION</div>
        ${accentLine ? `<div style="margin-top:16px;font-family:Arial,sans-serif;font-size:11px;color:#888;letter-spacing:3px;text-transform:uppercase;">${accentLine}</div>` : ''}
      </td>
    </tr>
    <!-- Gold rule -->
    <tr>
      <td style="height:3px;background:linear-gradient(90deg,#0a0a0a,#c8b89a,#0a0a0a);"></td>
    </tr>
  `;
}

/* ── Shared footer ────────────────────────────────────────────── */
function emailFooter() {
  return `
    <!-- FOOTER -->
    <tr>
      <td style="
        background: #faf7f3;
        border-top: 1px solid #ede8e0;
        padding: 32px 40px;
        text-align: center;
      ">
        <!-- Need Help -->
        <div style="
          font-family: Georgia, serif;
          font-size: 16px;
          font-weight: 700;
          color: #111;
          margin-bottom: 10px;
        ">Need Help?</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;line-height:2;">
          <a href="mailto:${SUPPORT_EMAIL()}" style="color:#111;text-decoration:none;font-weight:700;">${SUPPORT_EMAIL()}</a><br>
          <a href="tel:${SUPPORT_PHONE()}" style="color:#555;text-decoration:none;">${SUPPORT_PHONE()}</a>
        </div>

        <!-- Divider -->
        <div style="margin:22px auto;width:60px;height:1px;background:linear-gradient(90deg,transparent,#c8b89a,transparent);"></div>

        <!-- Instagram -->
        <a href="${IG_URL()}" style="
          display:inline-block;
          background:#111;
          color:#fff;
          text-decoration:none;
          padding:10px 24px;
          border-radius:999px;
          font-family:Arial,sans-serif;
          font-size:11px;
          font-weight:700;
          letter-spacing:2px;
          text-transform:uppercase;
          margin-bottom:22px;
        ">Follow @SHENOVA</a>

        <!-- Brand -->
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#bbb;text-transform:uppercase;">SHENOVA LUXURY FASHION</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#ccc;margin-top:6px;">
          <a href="${FE_URL()}" style="color:#bbb;text-decoration:none;">${FE_URL()}</a>
        </div>
      </td>
    </tr>
  `;
}

/* ── Shared tracking timeline ─────────────────────────────────── */
function trackingTimeline(activeStep) {
  // activeStep: 0=Ordered, 1=Confirmed, 2=Shipped, 3=OutForDelivery, 4=Delivered
  const steps = [
    { icon: '✓', label: 'Ordered' },
    { icon: '✓', label: 'Confirmed' },
    { icon: '✈', label: 'Shipped' },
    { icon: '🚚', label: 'Out For Delivery' },
    { icon: '❤', label: 'Delivered' },
  ];

  const stepHtml = steps.map((s, i) => {
    const done    = i <= activeStep;
    const current = i === activeStep;
    const circle = done
      ? `background:#111;border:2px solid #111;color:#fff;`
      : `background:#f0e8dc;border:2px dashed #c8b89a;color:#c8b89a;`;
    const labelColor = done ? '#111' : '#aaa';
    const subLabel = current ? `<div style="font-size:10px;color:#c8b89a;font-weight:700;letter-spacing:1px;margin-top:3px;">● NOW</div>` : '';

    const connector = i < steps.length - 1
      ? `<td style="vertical-align:middle;padding-bottom:16px;"><div style="height:1px;background:${i < activeStep ? '#111' : '#e0d8d0'};"></div></td>`
      : '';

    return `
      <td align="center" style="vertical-align:top;padding:0 4px;">
        <div style="width:36px;height:36px;border-radius:50%;${circle}margin:0 auto 8px;line-height:32px;text-align:center;font-size:14px;">${s.icon}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${labelColor};letter-spacing:0.5px;white-space:nowrap;">${s.label}</div>
        ${subLabel}
      </td>
      ${connector}
    `;
  }).join('');

  return `
    <tr>
      <td style="padding:28px 30px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>${stepHtml}</tr>
        </table>
      </td>
    </tr>
  `;
}

/* ── Item row ─────────────────────────────────────────────────── */
function itemRow(item) {
  const qty   = item.qty || item.quantity || 1;
  const price = Number(item.price || 0) * qty;
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #ede8e0;vertical-align:top;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align:top;padding-right:12px;width:64px;">
              ${item.image
                ? `<img src="${item.image}" width="56" height="70" alt="${item.name||''}" style="border-radius:8px;object-fit:cover;display:block;">`
                : `<div style="width:56px;height:70px;border-radius:8px;background:#f2ece4;"></div>`}
            </td>
            <td style="vertical-align:top;">
              <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111;">${item.name || 'Item'}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:4px;">SIZE: ${item.size||'—'} · QTY: ${qty}</div>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111;">₹${price.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/* ── Outer wrapper ────────────────────────────────────────────── */
function wrapEmail(innerRows, subjectHint = '') {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>${subjectHint}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
    body{margin:0!important;padding:0!important;background-color:#f5f0ea!important;}
    @media(prefers-color-scheme:dark){
      body{background-color:#f5f0ea!important;}
      .ec{background-color:#ffffff!important;color:#111!important;}
    }
    @media only screen and (max-width:620px){
      .ec{border-radius:0!important;}
      .ep{padding:20px 16px!important;}
      .cta-btn{display:block!important;width:100%!important;box-sizing:border-box!important;margin-bottom:10px!important;}
      .hide-mob{display:none!important;}
    }
  </style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f0ea;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table class="ec" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:24px;overflow:hidden;max-width:600px;width:100%;">
        ${innerRows}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ════════════════════════════════════════════════════════════════
   1. SHIPPED EMAIL TEMPLATE
════════════════════════════════════════════════════════════════ */
const shippedTemplate = (data) => {
  const {
    customerName   = 'Valued Customer',
    orderId        = '',
    items          = [],
    totalAmount    = 0,
    courierName    = '',
    trackingId     = '',
    trackingUrl    = '',
    estimatedDate  = '',
    shippingAddress= '',
  } = data;

  const shortId       = String(orderId).slice(-8).toUpperCase();
  const trackOrderUrl = trackingUrl || `${FE_URL()}/track-order?orderId=${orderId}`;
  const estDateHtml   = estimatedDate
    ? `<tr><td style="padding:0 40px 16px;font-family:Arial,sans-serif;font-size:14px;color:#555;text-align:center;">
        📅 <strong>Estimated Delivery:</strong> ${estimatedDate}
       </td></tr>`
    : '';

  const trackBtnHtml = `
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <a href="${trackOrderUrl}"
          style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;border-radius:999px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
          Track My Order
        </a>
      </td>
    </tr>
  `;

  const courierBlock = `
    <tr>
      <td style="padding:0 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f3;border:1px solid #ede8e0;border-radius:16px;padding:0;">
          <tr>
            <td style="padding:22px 24px;">
              <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#c8b89a;text-transform:uppercase;margin-bottom:14px;">Shipping Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${courierName ? `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding-bottom:8px;">Courier Partner</td><td style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111;text-align:right;">${courierName}</td></tr>` : ''}
                ${trackingId  ? `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding-bottom:8px;">Tracking ID / AWB</td><td style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111;text-align:right;letter-spacing:1px;">${trackingId}</td></tr>` : ''}
                ${estimatedDate ? `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding-bottom:8px;">Est. Delivery</td><td style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#27a35a;text-align:right;">${estimatedDate}</td></tr>` : ''}
                ${shippingAddress ? `<tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#888;padding-top:4px;">Shipping To</td><td style="font-family:Arial,sans-serif;font-size:13px;color:#555;text-align:right;line-height:1.5;">${shippingAddress}</td></tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const itemsHtml = items.length > 0 ? items.map(itemRow).join('') : `<tr><td style="padding:16px 0;font-family:Arial,sans-serif;font-size:14px;color:#888;">—</td></tr>`;

  const inner = `
    ${emailHeader('Your Order Is On Its Way ✈')}

    <!-- Hero message -->
    <tr>
      <td style="padding:40px 40px 28px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">📦</div>
        <div style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#111;letter-spacing:1px;margin-bottom:10px;">It's Shipped, ${customerName.split(' ')[0]}!</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#777;line-height:1.7;max-width:400px;margin:0 auto;">
          Your SHENOVA order <strong>#${shortId}</strong> has left our boutique and is on its way to you. Exciting times ✨
        </div>
      </td>
    </tr>

    ${trackingTimeline(2)}
    ${courierBlock}
    ${trackBtnHtml}
    ${estDateHtml}

    <!-- Items -->
    <tr>
      <td style="padding:0 40px 32px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#c8b89a;text-transform:uppercase;margin-bottom:16px;">Your Order</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr>
            <td style="padding:16px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#111;">
              Total: ₹${Number(totalAmount).toLocaleString('en-IN')}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Thank you note -->
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:16px;color:#111;line-height:1.8;font-style:italic;">
          "Every piece is crafted with love. We hope it brings you joy."
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;margin-top:8px;letter-spacing:2px;text-transform:uppercase;">— The SHENOVA Team</div>
      </td>
    </tr>

    ${emailFooter()}
  `;

  return wrapEmail(inner, `Your SHENOVA Order #${shortId} Has Shipped!`);
};

/* ════════════════════════════════════════════════════════════════
   2. OUT FOR DELIVERY EMAIL TEMPLATE
════════════════════════════════════════════════════════════════ */
const outForDeliveryTemplate = (data) => {
  const {
    customerName  = 'Valued Customer',
    orderId       = '',
    items         = [],
    totalAmount   = 0,
    courierName   = '',
    trackingId    = '',
    trackingUrl   = '',
  } = data;

  const shortId       = String(orderId).slice(-8).toUpperCase();
  const trackOrderUrl = trackingUrl || `${FE_URL()}/track-order?orderId=${orderId}`;

  const courierMini = (courierName || trackingId) ? `
    <tr>
      <td style="padding:0 40px 24px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#777;">
          ${courierName ? `<span style="font-weight:700;color:#111;">${courierName}</span> · ` : ''}
          ${trackingId  ? `AWB: <span style="font-weight:700;color:#111;">${trackingId}</span>` : ''}
        </div>
      </td>
    </tr>` : '';

  const itemsHtml = items.length > 0 ? items.map(itemRow).join('') : '';

  const inner = `
    ${emailHeader('Out For Delivery Today 🚚')}

    <!-- Hero -->
    <tr>
      <td style="padding:44px 40px 28px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">🚚</div>
        <div style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#111;letter-spacing:1px;margin-bottom:10px;">Almost There, ${customerName.split(' ')[0]}!</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#777;line-height:1.7;max-width:380px;margin:0 auto;">
          Your SHENOVA order <strong>#${shortId}</strong> is out for delivery today. Please ensure someone is available to receive it.
        </div>
      </td>
    </tr>

    ${trackingTimeline(3)}
    ${courierMini}

    <!-- CTA -->
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <a href="${trackOrderUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:16px 40px;border-radius:999px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Track Delivery</a>
      </td>
    </tr>

    <!-- Items -->
    ${itemsHtml ? `
    <tr>
      <td style="padding:0 40px 32px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#c8b89a;text-transform:uppercase;margin-bottom:16px;">Your Order</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr><td style="padding:12px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#111;">Total: ₹${Number(totalAmount).toLocaleString('en-IN')}</td></tr>
        </table>
      </td>
    </tr>` : ''}

    <!-- Note -->
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;line-height:1.7;">
          If you're not available, ask a trusted neighbour to receive your package.<br>For any concerns, reply to this email or call us.
        </div>
      </td>
    </tr>

    ${emailFooter()}
  `;

  return wrapEmail(inner, `Your SHENOVA Order #${shortId} Is Out For Delivery!`);
};

/* ════════════════════════════════════════════════════════════════
   3. DELIVERED EMAIL TEMPLATE
════════════════════════════════════════════════════════════════ */
const deliveredTemplate = (data) => {
  const {
    customerName = 'Valued Customer',
    orderId      = '',
    items        = [],
    totalAmount  = 0,
  } = data;

  const shortId   = String(orderId).slice(-8).toUpperCase();
  const itemsHtml = items.length > 0 ? items.map(itemRow).join('') : '';

  const inner = `
    ${emailHeader('Your Order Has Been Delivered ❤')}

    <!-- Hero -->
    <tr>
      <td style="padding:44px 40px 28px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">🎁</div>
        <div style="font-family:Georgia,serif;font-size:30px;font-weight:400;color:#111;letter-spacing:1px;margin-bottom:12px;">Delivered With Love ❤️</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#777;line-height:1.7;max-width:400px;margin:0 auto;">
          Your SHENOVA order <strong>#${shortId}</strong> has been delivered. We hope you absolutely love your new piece, ${customerName.split(' ')[0]}!
        </div>
      </td>
    </tr>

    ${trackingTimeline(4)}

    <!-- Items -->
    ${itemsHtml ? `
    <tr>
      <td style="padding:0 40px 28px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#c8b89a;text-transform:uppercase;margin-bottom:16px;">What You Received</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr><td style="padding:12px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#111;">Total: ₹${Number(totalAmount).toLocaleString('en-IN')}</td></tr>
        </table>
      </td>
    </tr>` : ''}

    <!-- CTA -->
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${FE_URL()}" style="display:block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;border-radius:999px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;">Shop Again</a>
            </td>
            <td style="padding-left:8px;">
              <a href="mailto:${SUPPORT_EMAIL()}" style="display:block;background:transparent;color:#111;text-decoration:none;padding:13px 20px;border-radius:999px;border:1.5px solid #111;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;">Need Help?</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Brand love note -->
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:15px;color:#111;line-height:1.9;font-style:italic;">
          "Wear it with confidence. You deserve the finest."
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;margin-top:8px;letter-spacing:2px;text-transform:uppercase;">— The SHENOVA Team</div>
      </td>
    </tr>

    ${emailFooter()}
  `;

  return wrapEmail(inner, `Your SHENOVA Order #${shortId} Has Been Delivered ❤️`);
};

/* ════════════════════════════════════════════════════════════════
   4. CANCELLED EMAIL TEMPLATE
════════════════════════════════════════════════════════════════ */
const cancelledTemplate = (data) => {
  const {
    customerName   = 'Valued Customer',
    orderId        = '',
    items          = [],
    totalAmount    = 0,
    cancellationNote = '',
  } = data;

  const shortId   = String(orderId).slice(-8).toUpperCase();
  const itemsHtml = items.length > 0 ? items.map(itemRow).join('') : '';

  const noteBlock = cancellationNote ? `
    <tr>
      <td style="padding:0 40px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #ffe0e0;border-radius:14px;">
          <tr>
            <td style="padding:18px 22px;font-family:Arial,sans-serif;font-size:13px;color:#b42318;line-height:1.6;">
              <strong>Note:</strong> ${cancellationNote}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  const inner = `
    ${emailHeader('Order Cancellation Notice')}

    <!-- Hero -->
    <tr>
      <td style="padding:44px 40px 28px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">💔</div>
        <div style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#111;letter-spacing:1px;margin-bottom:12px;">Order Cancelled</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#777;line-height:1.7;max-width:400px;margin:0 auto;">
          We're sorry to see you go, ${customerName.split(' ')[0]}. Your order <strong>#${shortId}</strong> has been cancelled. If this was a mistake or you need assistance, we're here for you.
        </div>
      </td>
    </tr>

    ${noteBlock}

    <!-- Items cancelled -->
    ${itemsHtml ? `
    <tr>
      <td style="padding:0 40px 28px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#c8b89a;text-transform:uppercase;margin-bottom:16px;">Cancelled Items</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="opacity:0.6;">
          ${itemsHtml}
        </table>
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#999;text-align:right;padding-top:12px;">Order Value: ₹${Number(totalAmount).toLocaleString('en-IN')}</div>
      </td>
    </tr>` : ''}

    <!-- CTA -->
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${FE_URL()}" style="display:block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;border-radius:999px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;">Shop Again</a>
            </td>
            <td style="padding-left:8px;">
              <a href="mailto:${SUPPORT_EMAIL()}" style="display:block;background:transparent;color:#111;text-decoration:none;padding:13px 20px;border-radius:999px;border:1.5px solid #111;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:center;">Contact Us</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Closing note -->
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#888;line-height:1.7;">
          If a payment was made, any refund will be processed within 5–7 business days to your original payment method.
        </div>
      </td>
    </tr>

    ${emailFooter()}
  `;

  return wrapEmail(inner, `Your SHENOVA Order #${shortId} Has Been Cancelled`);
};

module.exports = {
  shippedTemplate,
  outForDeliveryTemplate,
  deliveredTemplate,
  cancelledTemplate,
};
