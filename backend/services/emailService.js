/* ================================================================
   services/emailService.js — SHENOVA Luxury Email Service
   ================================================================
   ✅ CommonJS (require / module.exports) — no import/export
   ✅ Resend SDK
   ✅ Fully isolated try/catch — email failure NEVER crashes order
   ✅ Debug logs at every step
   ================================================================ */

'use strict';

const { Resend } = require('resend');
const { orderConfirmationTemplate } = require('../templates/orderConfirmationTemplate');

// ── Lazy-init Resend client (safe if key is missing during tests) ──
let _resend = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn('⚠️  [EmailService] RESEND_API_KEY is not set in environment variables.');
    }
    _resend = new Resend(key || 'missing_key');
  }
  return _resend;
}

/**
 * sendOrderConfirmationEmail
 *
 * @param {Object} orderData
 * @param {string}   orderData.customerName      — e.g. "Priya Shah"
 * @param {string}   orderData.customerEmail     — recipient address
 * @param {string}   orderData.orderId           — MongoDB _id string
 * @param {Array}    orderData.items             — order.items array from DB
 * @param {number}   orderData.totalAmount       — final paid amount (INR)
 * @param {string}   orderData.shippingAddress   — pre-formatted address string
 * @param {boolean}  orderData.isCOD             — true for Cash on Delivery orders
 * @param {number}   orderData.codAdvancePaid    — ₹100 advance for COD
 *
 * @returns {Promise<Object|null>}  Resend response or null on failure
 */
const sendOrderConfirmationEmail = async (orderData) => {

  console.log('\n📧 [EmailService] ── sendOrderConfirmationEmail() started ──');
  console.log('📧 [EmailService] Recipient :', orderData.customerEmail);
  console.log('📧 [EmailService] Customer  :', orderData.customerName);
  console.log('📧 [EmailService] Order ID  :', orderData.orderId);
  console.log('📧 [EmailService] Total     : ₹' + orderData.totalAmount);
  console.log('📧 [EmailService] Items     :', (orderData.items || []).length, 'item(s)');
  console.log('📧 [EmailService] COD?      :', orderData.isCOD ? 'YES' : 'NO');

  // ── Guard: skip if no recipient ────────────────────────────────
  if (!orderData.customerEmail) {
    console.error('❌ [EmailService] No customerEmail — skipping send.');
    return null;
  }

  try {
    console.log('📧 [EmailService] Building HTML template...');
    const html = orderConfirmationTemplate(orderData);
    console.log('📧 [EmailService] Template built — length:', html.length, 'chars');

    const from    = process.env.EMAIL_FROM    || 'SHENOVA <onboarding@resend.dev>';
    const subject = orderData.isCOD
      ? `Your SHENOVA Order is Confirmed (COD) ✨ — #${orderData.orderId}`
      : `Your SHENOVA Order is Confirmed ✨ — #${orderData.orderId}`;

    console.log('📧 [EmailService] Sending via Resend...');
    console.log('📧 [EmailService] From    :', from);
    console.log('📧 [EmailService] Subject :', subject);

    const resend   = getResend();
    const response = await resend.emails.send({
      from,
      to:      orderData.customerEmail,
      subject,
      html,
    });

    console.log('✅ [EmailService] Email sent successfully!');
    console.log('✅ [EmailService] Resend response:', JSON.stringify(response));

    return response;

  } catch (error) {
    // ── CRITICAL: Log everything but NEVER throw ───────────────────
    console.error('❌ [EmailService] Email send FAILED — order is still saved.');
    console.error('❌ [EmailService] Error name   :', error.name);
    console.error('❌ [EmailService] Error message:', error.message);
    if (error.statusCode) console.error('❌ [EmailService] Status code :', error.statusCode);
    if (error.response)  console.error('❌ [EmailService] API response:', JSON.stringify(error.response));
    return null;
  }
};

module.exports = { sendOrderConfirmationEmail };