/* ================================================================
   services/emailService.js — SHENOVA Email Service (UPDATED)
   ================================================================
   ✅ CommonJS (require / module.exports) — no import/export
   ✅ Resend SDK
   ✅ All email failures are isolated — never crash the app
   ✅ Original sendOrderConfirmationEmail() fully preserved
   ✅ NEW: sendShippedEmail, sendOutForDeliveryEmail,
           sendDeliveredEmail, sendCancelledEmail
   ================================================================

   HOW TO INTEGRATE:
   Replace your existing services/emailService.js with this file.
   No other file needs to change for the email service layer.
   ================================================================ */

'use strict';

const { Resend } = require('resend');
const { orderConfirmationTemplate } = require('../templates/orderConfirmationTemplate');

/* ── NEW shipping templates ─────────────────────────────────── */
const {
  shippedTemplate,
  outForDeliveryTemplate,
  deliveredTemplate,
  cancelledTemplate,
} = require('../templates/shippingEmailTemplates');

/* ── Lazy-init Resend client ─────────────────────────────────── */
let _resend = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) console.warn('⚠️  [EmailService] RESEND_API_KEY is not set.');
    _resend = new Resend(key || 'missing_key');
  }
  return _resend;
}

/* ── Core sender helper ──────────────────────────────────────── */
async function _send({ to, subject, html, tag }) {
  if (!to) {
    console.error(`❌ [EmailService/${tag}] No recipient — skipping.`);
    return null;
  }
  try {
    const from     = process.env.EMAIL_FROM || 'SHENOVA <onboarding@resend.dev>';
    const resend   = getResend();
    const response = await resend.emails.send({ from, to, subject, html });
    console.log(`✅ [EmailService/${tag}] Sent → ${to} | ID: ${JSON.stringify(response)}`);
    return response;
  } catch (error) {
    console.error(`❌ [EmailService/${tag}] FAILED — order still safe.`);
    console.error(`   name   : ${error.name}`);
    console.error(`   message: ${error.message}`);
    if (error.statusCode) console.error(`   status : ${error.statusCode}`);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   ORIGINAL — Order Confirmation (PRESERVED EXACTLY)
════════════════════════════════════════════════════════════════ */
const sendOrderConfirmationEmail = async (orderData) => {
  console.log('\n📧 [EmailService] ── sendOrderConfirmationEmail() started ──');
  console.log('📧 [EmailService] Recipient :', orderData.customerEmail);
  console.log('📧 [EmailService] Customer  :', orderData.customerName);
  console.log('📧 [EmailService] Order ID  :', orderData.orderId);
  console.log('📧 [EmailService] Total     : ₹' + orderData.totalAmount);
  console.log('📧 [EmailService] Items     :', (orderData.items || []).length, 'item(s)');
  console.log('📧 [EmailService] COD?      :', orderData.isCOD ? 'YES' : 'NO');

  if (!orderData.customerEmail) {
    console.error('❌ [EmailService] No customerEmail — skipping send.');
    return null;
  }

  try {
    const html     = orderConfirmationTemplate(orderData);
    const from     = process.env.EMAIL_FROM || 'SHENOVA <onboarding@resend.dev>';
    const subject  = orderData.isCOD
      ? `Your SHENOVA Order is Confirmed (COD) ✨ — #${orderData.orderId}`
      : `Your SHENOVA Order is Confirmed ✨ — #${orderData.orderId}`;

    const resend   = getResend();
    const response = await resend.emails.send({ from, to: orderData.customerEmail, subject, html });

    console.log('✅ [EmailService] Order confirmation sent!');
    console.log('✅ [EmailService] Resend response:', JSON.stringify(response));
    return response;
  } catch (error) {
    console.error('❌ [EmailService] Email send FAILED — order is still saved.');
    console.error('❌ [EmailService] Error name   :', error.name);
    console.error('❌ [EmailService] Error message:', error.message);
    if (error.statusCode) console.error('❌ [EmailService] Status code :', error.statusCode);
    if (error.response)  console.error('❌ [EmailService] API response:', JSON.stringify(error.response));
    return null;
  }
};

/* ════════════════════════════════════════════════════════════════
   NEW — Shipped Email
   @param {Object} data — { customerName, customerEmail, orderId,
     items, totalAmount, shippingAddress, courierName, trackingId,
     trackingUrl, estimatedDate }
════════════════════════════════════════════════════════════════ */
const sendShippedEmail = async (data) => {
  console.log('\n✈️  [EmailService] sendShippedEmail() →', data.customerEmail, '| Order:', data.orderId);
  const shortId = String(data.orderId || '').slice(-8).toUpperCase();
  const html    = shippedTemplate(data);
  return _send({
    to:      data.customerEmail,
    subject: `Your SHENOVA Order #${shortId} Has Shipped! 📦`,
    html,
    tag:     'shipped',
  });
};

/* ════════════════════════════════════════════════════════════════
   NEW — Out For Delivery Email
════════════════════════════════════════════════════════════════ */
const sendOutForDeliveryEmail = async (data) => {
  console.log('\n🚚 [EmailService] sendOutForDeliveryEmail() →', data.customerEmail, '| Order:', data.orderId);
  const shortId = String(data.orderId || '').slice(-8).toUpperCase();
  const html    = outForDeliveryTemplate(data);
  return _send({
    to:      data.customerEmail,
    subject: `Your SHENOVA Order #${shortId} Is Out For Delivery Today 🚚`,
    html,
    tag:     'outForDelivery',
  });
};

/* ════════════════════════════════════════════════════════════════
   NEW — Delivered Email
════════════════════════════════════════════════════════════════ */
const sendDeliveredEmail = async (data) => {
  console.log('\n❤️  [EmailService] sendDeliveredEmail() →', data.customerEmail, '| Order:', data.orderId);
  const shortId = String(data.orderId || '').slice(-8).toUpperCase();
  const html    = deliveredTemplate(data);
  return _send({
    to:      data.customerEmail,
    subject: `Your SHENOVA Order #${shortId} Has Been Delivered ❤️`,
    html,
    tag:     'delivered',
  });
};

/* ════════════════════════════════════════════════════════════════
   NEW — Cancelled Email
════════════════════════════════════════════════════════════════ */
const sendCancelledEmail = async (data) => {
  console.log('\n❌ [EmailService] sendCancelledEmail() →', data.customerEmail, '| Order:', data.orderId);
  const shortId = String(data.orderId || '').slice(-8).toUpperCase();
  const html    = cancelledTemplate(data);
  return _send({
    to:      data.customerEmail,
    subject: `Your SHENOVA Order #${shortId} Has Been Cancelled`,
    html,
    tag:     'cancelled',
  });
};

/* ── Low stock alert (existing, non-breaking) ─────────────────── */
const sendLowStockAlertEmail = async (stockData) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || 'shenova@shenovaofficial.com';
  const { productName, stockAfter, status, orderId } = stockData || {};
  const html = `<div style="font-family:Arial,sans-serif;padding:24px;">
    <h2 style="color:#b42318;">⚠️ Low Stock Alert — SHENOVA Admin</h2>
    <p><strong>Product:</strong> ${productName}</p>
    <p><strong>Stock Remaining:</strong> ${stockAfter}</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Triggered by Order:</strong> ${orderId}</p>
    <hr><p style="color:#888;font-size:12px;">SHENOVA Admin Notification</p>
  </div>`;
  return _send({
    to:      adminEmail,
    subject: `⚠️ Low Stock: "${productName}" — ${stockAfter} left`,
    html,
    tag:     'lowStock',
  });
};

module.exports = {
  sendOrderConfirmationEmail,   // original — preserved
  sendShippedEmail,             // NEW
  sendOutForDeliveryEmail,      // NEW
  sendDeliveredEmail,           // NEW
  sendCancelledEmail,           // NEW
  sendLowStockAlertEmail,       // existing helper
};
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendShippingConfirmationEmail = async ({
  customerName,
  customerEmail,
  orderId,
  courierName,
  trackingId,
  trackingUrl,
  estimatedDate
}) => {

  try {

    console.log("📧 Sending shipping email to:", customerEmail);

    const html = `
    
    <div style="font-family:Arial;padding:40px;background:#f5f5f5;color:#111;">

      <div style="max-width:600px;margin:auto;background:#fff;border-radius:24px;padding:40px;">

        <h1 style="font-size:34px;margin-bottom:10px;">
          SHENOVA
        </h1>

        <p style="font-size:15px;color:#777;margin-bottom:30px;">
          Your order has been shipped ✨
        </p>

        <h2 style="margin-bottom:20px;">
          Hi ${customerName},
        </h2>

        <p style="line-height:1.8;color:#444;">
          Great news — your SHENOVA order is now on the way 🚚
        </p>

        <div style="
          background:#faf7f2;
          padding:24px;
          border-radius:18px;
          margin:30px 0;
        ">

          <p><strong>Order ID:</strong> #${orderId}</p>

          <p><strong>Courier:</strong> ${courierName}</p>

          <p><strong>Tracking ID:</strong> ${trackingId}</p>

          ${
            estimatedDate
            ? `<p><strong>Estimated Delivery:</strong> ${estimatedDate}</p>`
            : ""
          }

        </div>

        ${
          trackingUrl
          ? `
          <a
            href="${trackingUrl}"
            style="
              display:inline-block;
              padding:14px 28px;
              background:#111;
              color:#fff;
              border-radius:999px;
              text-decoration:none;
              margin-bottom:30px;
            "
          >
            Track Order
          </a>
          `
          : ""
        }

        <p style="color:#666;line-height:1.8;">
          Thank you for shopping with SHENOVA ❤️
        </p>

      </div>

    </div>
    
    `;

    const response = await resend.emails.send({

      from: process.env.EMAIL_FROM,

      to: customerEmail,

      subject: "Your SHENOVA Order Has Been Shipped ✨",

      html

    });

    console.log("✅ SHIPPING EMAIL SENT:", response);

  } catch (err) {

    console.log("❌ SHIPPING EMAIL ERROR:", err);

  }

};

module.exports.sendShippingConfirmationEmail =
  sendShippingConfirmationEmail;