/* ================================================================
   templates/orderConfirmationTemplate.js — SHENOVA Luxury Email
   ================================================================
   ✅ CommonJS (require / module.exports) — no import/export
   ✅ Inline CSS only (Gmail / Apple Mail / Outlook compatible)
   ✅ Mobile responsive (max-width media query via <style> block)
   ✅ Dark mode safe (forced white background on content)
   ✅ env vars accessed safely with || fallbacks
   ================================================================ */

'use strict';

/**
 * Formats a single order item row for the email table.
 * @param {Object} item
 */
function buildItemRow(item) {
  const qty      = item.qty   || item.quantity || 1;
  const size     = item.size  || '—';
  const color    = item.color ? ` · ${item.color}` : '';
  const price    = Number(item.price || 0) * qty;

  return `
    <tr>
      <td style="
        padding: 16px 0;
        border-bottom: 1px solid #ede8e0;
        vertical-align: top;
      ">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align: top; padding-right: 14px;">
              ${item.image
                ? `<img
                    src="${item.image}"
                    alt="${item.name || 'Item'}"
                    width="64"
                    height="80"
                    style="
                      display: block;
                      border-radius: 8px;
                      object-fit: cover;
                      background: #f2ece4;
                    "
                  >`
                : `<div style="
                    width:64px;height:80px;border-radius:8px;
                    background:#f2ece4;display:inline-block;
                  "></div>`
              }
            </td>
            <td style="vertical-align: top;">
              <div style="
                font-size: 15px;
                font-weight: 700;
                color: #111;
                letter-spacing: 0.3px;
                line-height: 1.4;
              ">${item.name || 'Item'}</div>
              <div style="
                margin-top: 5px;
                font-size: 13px;
                color: #888;
                letter-spacing: 0.5px;
              ">SIZE: ${size}${color}</div>
              <div style="
                margin-top: 3px;
                font-size: 13px;
                color: #888;
              ">QTY: ${qty}</div>
            </td>
            <td style="
              vertical-align: top;
              text-align: right;
              white-space: nowrap;
              font-size: 15px;
              font-weight: 700;
              color: #111;
            ">₹${price.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Main template function.
 * @param {Object} order
 */
const orderConfirmationTemplate = (order) => {

  // ── Safe field extraction (matches actual Order schema) ─────────
  const customerName    = order.customerName    || 'Valued Customer';
  const orderId         = String(order.orderId  || order._id || '');
  const shortOrderId    = orderId.slice(-8).toUpperCase();
  const items           = Array.isArray(order.items) ? order.items : [];
  const totalAmount     = Number(order.totalAmount || order.total || 0);
  const shippingAddress = (order.shippingAddress || '').trim().replace(/\s+/g, ' ');
  const isCOD           = Boolean(order.isCOD);
  const codAdvancePaid  = Number(order.codAdvancePaid || 0);
  const codRemaining    = Number(order.codRemainingAmount || Math.max(0, totalAmount - codAdvancePaid));

  // ── Env vars with safe fallbacks ───────────────────────────────
  const frontendUrl   = process.env.FRONTEND_URL  || 'https://shenovaofficial.com';
  const supportEmail  = process.env.SUPPORT_EMAIL || 'shenova@shenovaofficial.com';
  const supportPhone  = process.env.SUPPORT_PHONE || '+91 70417 02391';

  // ── Payment status block ─────────────────────────────────────────
  const paymentStatusHtml = isCOD
    ? `<div style="
        display: inline-block;
        background: #fff8e8;
        color: #b07d00;
        border: 1px solid #f0d080;
        padding: 8px 18px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 1px;
      ">COD — ₹100 ADVANCE PAID</div>`
    : `<div style="
        display: inline-block;
        background: #ebf7ef;
        color: #1a6b3a;
        border: 1px solid #b2dfc3;
        padding: 8px 18px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 1px;
      ">✓ PAID IN FULL</div>`;

  // ── COD remaining note ───────────────────────────────────────────
  const codRemainingHtml = isCOD
    ? `<tr>
        <td style="padding: 0 40px 24px;">
          <table width="100%" style="
            background: #fffbf0;
            border: 1px solid #f0d080;
            border-radius: 14px;
            padding: 18px 22px;
          ">
            <tr>
              <td>
                <div style="font-size: 13px; color: #b07d00; font-weight: 700; letter-spacing: 1px;">
                  COD PAYMENT DETAILS
                </div>
                <div style="margin-top: 10px; font-size: 14px; color: #555; line-height: 1.8;">
                  Advance Paid: <strong>₹${codAdvancePaid.toLocaleString('en-IN')}</strong><br>
                  Remaining at Delivery: <strong>₹${codRemaining.toLocaleString('en-IN')}</strong>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  // ── Items HTML ──────────────────────────────────────────────────
  const itemsHtml = items.length > 0
    ? items.map(buildItemRow).join('')
    : `<tr><td style="padding:16px 0;color:#888;font-size:14px;">No items found.</td></tr>`;

  // ── Full email HTML ─────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Your SHENOVA Order is Confirmed</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');

    /* ── Reset ── */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f5f0ea !important; }

    /* ── Dark mode override — keep content white ── */
    @media (prefers-color-scheme: dark) {
      body { background-color: #f5f0ea !important; }
      .email-wrapper { background-color: #f5f0ea !important; }
      .email-card { background-color: #ffffff !important; color: #111111 !important; }
    }

    /* ── Mobile ── */
    @media only screen and (max-width: 620px) {
      .email-card { border-radius: 0 !important; }
      .email-padding { padding: 24px 20px !important; }
      .cta-table td { display: block !important; text-align: center !important; padding-bottom: 12px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .header-title { font-size: 28px !important; letter-spacing: 5px !important; }
      .confirm-heading { font-size: 24px !important; }
      .item-img { display: none !important; }
    }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════
     OUTER WRAPPER
════════════════════════════════════════════════════════════════ -->
<table
  class="email-wrapper"
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="background-color: #f5f0ea; margin: 0; padding: 0;"
>
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <!-- ═══════════════════════════════════════════════════════
           EMAIL CARD
      ══════════════════════════════════════════════════════════ -->
      <table
        class="email-card"
        width="600"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 40px rgba(0,0,0,0.10);
          max-width: 600px;
        "
      >

        <!-- ── HEADER ───────────────────────────────────────────── -->
        <tr>
          <td style="
            background: linear-gradient(135deg, #111111 0%, #2c2c2c 100%);
            padding: 44px 40px 36px;
            text-align: center;
          ">
            <!-- Logo wordmark -->
            <div class="header-title" style="
              font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
              font-size: 34px;
              font-weight: 700;
              letter-spacing: 10px;
              color: #ffffff;
              text-transform: uppercase;
            ">SHENOVA</div>

            <div style="
              margin-top: 8px;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              letter-spacing: 4px;
              color: #c8b89a;
              text-transform: uppercase;
            ">LUXURY FASHION</div>

            <!-- Decorative gold rule -->
            <div style="
              margin: 22px auto 0;
              width: 48px;
              height: 1px;
              background: linear-gradient(90deg, transparent, #c8b89a, transparent);
            "></div>
          </td>
        </tr>

        <!-- ── HERO CONFIRMATION ────────────────────────────────── -->
        <tr>
          <td class="email-padding" style="padding: 40px 40px 28px;">

            <!-- Checkmark icon -->
            <div style="
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: linear-gradient(135deg, #1a6b3a, #27a35a);
              margin: 0 0 22px 0;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              line-height: 60px;
              font-size: 28px;
              text-align: center;
            ">✓</div>

            <div class="confirm-heading" style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 30px;
              font-weight: 700;
              color: #111;
              line-height: 1.2;
              margin-bottom: 16px;
            ">Order Confirmed</div>

            <div style="
              font-family: Arial, Helvetica, sans-serif;
              font-size: 15px;
              color: #555;
              line-height: 1.8;
            ">
              Dear <strong style="color: #111;">${customerName}</strong>,<br><br>
              Thank you for shopping with SHENOVA. Your order has been successfully
              confirmed and is now being prepared with care. We will notify you
              as soon as your parcel is on its way.
            </div>
          </td>
        </tr>

        <!-- ── ORDER INFO CARD ──────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background: #faf7f3;
              border: 1px solid #ede8e0;
              border-radius: 16px;
            ">
              <tr>
                <!-- Order ID -->
                <td style="
                  padding: 22px 24px;
                  border-bottom: 1px solid #ede8e0;
                ">
                  <div style="
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    letter-spacing: 2px;
                    color: #aaa;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                  ">Order ID</div>
                  <div style="
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 15px;
                    font-weight: 700;
                    color: #111;
                    letter-spacing: 1px;
                  ">#${shortOrderId}</div>
                  <div style="
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                    color: #bbb;
                    margin-top: 3px;
                  ">${orderId}</div>
                </td>
              </tr>
              <tr>
                <!-- Payment Status -->
                <td style="padding: 22px 24px; border-bottom: 1px solid #ede8e0;">
                  <div style="
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    letter-spacing: 2px;
                    color: #aaa;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                  ">Payment Status</div>
                  ${paymentStatusHtml}
                </td>
              </tr>
              <tr>
                <!-- Delivery Estimate -->
                <td style="padding: 22px 24px;">
                  <div style="
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    letter-spacing: 2px;
                    color: #aaa;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                  ">Estimated Delivery</div>
                  <div style="
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    color: #111;
                  ">3 – 7 Business Days</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── COD REMAINING (only shown for COD orders) ──────── -->
        ${codRemainingHtml}

        <!-- ── ORDER ITEMS ──────────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 8px;">
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 20px;
              font-weight: 700;
              color: #111;
              margin-bottom: 4px;
            ">Order Summary</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 40px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemsHtml}
            </table>
          </td>
        </tr>

        <!-- ── TOTAL ────────────────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background: #111;
              border-radius: 14px;
              padding: 22px 26px;
            ">
              <tr>
                <td style="
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 13px;
                  letter-spacing: 2px;
                  color: #c8b89a;
                  text-transform: uppercase;
                ">Total ${isCOD ? 'Order Value' : 'Amount Paid'}</td>
                <td align="right" style="
                  font-family: 'Playfair Display', Georgia, serif;
                  font-size: 26px;
                  font-weight: 700;
                  color: #ffffff;
                ">₹${totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── SHIPPING ADDRESS ─────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 32px;">
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 18px;
              font-weight: 700;
              color: #111;
              margin-bottom: 14px;
            ">Shipping To</div>
            <div style="
              font-family: Arial, Helvetica, sans-serif;
              font-size: 14px;
              color: #555;
              line-height: 1.9;
              padding: 18px 22px;
              background: #faf7f3;
              border: 1px solid #ede8e0;
              border-radius: 12px;
              border-left: 3px solid #c8b89a;
            ">${shippingAddress || '—'}</div>
          </td>
        </tr>

        <!-- ── ORDER JOURNEY / STATUS ───────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 36px;">
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 18px;
              font-weight: 700;
              color: #111;
              margin-bottom: 20px;
            ">Order Journey</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>

                <!-- Step 1: Confirmed -->
                <td align="center" width="33%" style="vertical-align: top;">
                  <div style="
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: #111;
                    margin: 0 auto 10px;
                    line-height: 40px;
                    text-align: center;
                    font-size: 18px;
                  ">✓</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    color: #111;
                    letter-spacing: 0.5px;
                  ">Confirmed</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #27a35a;
                    margin-top: 4px;
                    font-weight: 700;
                  ">● NOW</div>
                </td>

                <!-- Connector -->
                <td style="vertical-align: top; padding-top: 20px;">
                  <div style="height: 1px; background: linear-gradient(90deg, #111, #ccc);"></div>
                </td>

                <!-- Step 2: Processing -->
                <td align="center" width="33%" style="vertical-align: top;">
                  <div style="
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: #f0e8dc;
                    border: 2px dashed #c8b89a;
                    margin: 0 auto 10px;
                    line-height: 36px;
                    text-align: center;
                    font-size: 16px;
                    color: #c8b89a;
                  ">⟳</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    color: #888;
                    letter-spacing: 0.5px;
                  ">Processing</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #bbb;
                    margin-top: 4px;
                  ">NEXT</div>
                </td>

                <!-- Connector -->
                <td style="vertical-align: top; padding-top: 20px;">
                  <div style="height: 1px; background: #e0d8d0;"></div>
                </td>

                <!-- Step 3: Shipped -->
                <td align="center" width="33%" style="vertical-align: top;">
                  <div style="
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: #f0e8dc;
                    border: 2px dashed #c8b89a;
                    margin: 0 auto 10px;
                    line-height: 36px;
                    text-align: center;
                    font-size: 16px;
                    color: #c8b89a;
                  ">✈</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    color: #888;
                    letter-spacing: 0.5px;
                  ">Shipped</div>
                  <div style="
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #bbb;
                    margin-top: 4px;
                  ">SOON</div>
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- ── CTA BUTTONS ──────────────────────────────────────── -->
        <tr>
          <td style="padding: 0 40px 40px;">
            <table class="cta-table" width="100%" cellpadding="0" cellspacing="0">
              <tr>

                <!-- Continue Shopping -->
                <td class="cta-table" style="padding-right: 8px; vertical-align: top;">
                  <a
                    href="${frontendUrl}"
                    class="cta-btn"
                    style="
                      display: inline-block;
                      background: #111;
                      color: #fff;
                      text-decoration: none;
                      padding: 14px 20px;
                      border-radius: 999px;
                      font-family: Arial, sans-serif;
                      font-size: 12px;
                      font-weight: 700;
                      letter-spacing: 1.5px;
                      text-transform: uppercase;
                      text-align: center;
                      width: 100%;
                      box-sizing: border-box;
                    "
                  >Continue Shopping</a>
                </td>

                <!-- Contact Support -->
                <td style="padding-left: 8px; vertical-align: top;">
                  <a
                    href="mailto:${supportEmail}"
                    class="cta-btn"
                    style="
                      display: inline-block;
                      background: transparent;
                      color: #111;
                      text-decoration: none;
                      padding: 13px 20px;
                      border-radius: 999px;
                      border: 1.5px solid #111;
                      font-family: Arial, sans-serif;
                      font-size: 12px;
                      font-weight: 700;
                      letter-spacing: 1.5px;
                      text-transform: uppercase;
                      text-align: center;
                      width: 100%;
                      box-sizing: border-box;
                    "
                  >Contact Support</a>
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- ── SUPPORT FOOTER ───────────────────────────────────── -->
        <tr>
          <td style="
            background: #faf7f3;
            border-top: 1px solid #ede8e0;
            padding: 32px 40px;
            text-align: center;
          ">
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 16px;
              font-weight: 700;
              color: #111;
              margin-bottom: 12px;
            ">Need Help?</div>

            <div style="
              font-family: Arial, sans-serif;
              font-size: 13px;
              color: #888;
              line-height: 2;
            ">
              <a href="mailto:${supportEmail}" style="color: #111; text-decoration: none; font-weight: 700;">
                ${supportEmail}
              </a><br>
              <a href="tel:${supportPhone}" style="color: #555; text-decoration: none;">
                ${supportPhone}
              </a>
            </div>

            <!-- Gold divider -->
            <div style="
              margin: 24px auto;
              width: 60px;
              height: 1px;
              background: linear-gradient(90deg, transparent, #c8b89a, transparent);
            "></div>

            <!-- Brand footer -->
            <div style="
              font-family: Arial, sans-serif;
              font-size: 11px;
              letter-spacing: 3px;
              color: #bbb;
              text-transform: uppercase;
            ">SHENOVA LUXURY FASHION</div>

            <div style="
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #ccc;
              margin-top: 6px;
            ">
              <a href="${frontendUrl}" style="color: #bbb; text-decoration: none;">${frontendUrl}</a>
            </div>
          </td>
        </tr>

      </table>
      <!-- /email-card -->

    </td>
  </tr>
</table>
<!-- /email-wrapper -->

</body>
</html>`;
};

module.exports = { orderConfirmationTemplate };