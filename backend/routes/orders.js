/**
 * routes/orders.js — SHENOVA Order Routes (UPDATED WITH SHIPPING)
 * ================================================================
 * ORIGINAL LOGIC FULLY PRESERVED:
 *   ✅ POST /  — stock validation + order creation + confirmation email
 *   ✅ GET /   — all orders (admin)
 *   ✅ DELETE  — delete order (admin)
 *
 * NEW ADDITIONS (non-breaking):
 *   ✅ PUT /:id — enhanced to save shipping details when status=shipped
 *   ✅ Automated emails on: shipped / out_for_delivery / delivered / cancelled
 *   ✅ New status values: out_for_delivery (added alongside existing ones)
 *   ✅ GET /:id — single order lookup (for customer tracking page)
 *
 * DATABASE:
 *   ✅ Order model extended via shippingInfo subdoc (additive, non-breaking)
 *   ✅ All existing Order fields remain untouched
 * ================================================================
 */

const router   = require('express').Router();
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const Coupon   = require('../models/Coupon');
const SpinLead = require('../models/SpinLead');

/* ── Email service ──────────────────────────────────────────────── */
let sendOrderConfirmationEmail = async () => {};
let sendLowStockAlertEmail     = async () => {};
let sendShippedEmail           = async () => {};
let sendOutForDeliveryEmail    = async () => {};
let sendDeliveredEmail         = async () => {};
let sendCancelledEmail         = async () => {};

try {
  const emailSvc = require('../services/emailService');
  if (emailSvc.sendOrderConfirmationEmail) sendOrderConfirmationEmail = emailSvc.sendOrderConfirmationEmail;
  if (emailSvc.sendLowStockAlertEmail)     sendLowStockAlertEmail     = emailSvc.sendLowStockAlertEmail;
  if (emailSvc.sendShippedEmail)           sendShippedEmail           = emailSvc.sendShippedEmail;
  if (emailSvc.sendOutForDeliveryEmail)    sendOutForDeliveryEmail    = emailSvc.sendOutForDeliveryEmail;
  if (emailSvc.sendDeliveredEmail)         sendDeliveredEmail         = emailSvc.sendDeliveredEmail;
  if (emailSvc.sendCancelledEmail)         sendCancelledEmail         = emailSvc.sendCancelledEmail;
} catch (e) {
  console.warn('[Orders] emailService not loaded:', e.message);
}

/* ── Stock thresholds ─────────────────────────────────────────── */
const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_EMAIL_AT  = [5, 2, 0];

function stockStatus(qty) {
  if (qty <= 0)                   return 'out_of_stock';
  if (qty <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

/* ── Stock validation ─────────────────────────────────────────── */
async function validateStock(items) {
  const errors = [];
  for (const item of items) {
    const productId = item.product || item.id || item._id;
    if (!productId) { errors.push(`Item "${item.name || 'unknown'}" has no product ID`); continue; }
    const p = await Product.findById(productId).select('name stock').lean();
    if (!p) { errors.push(`Product "${item.name || productId}" not found`); continue; }
    const reqQty = Number(item.qty) || 1;
    const stock  = Number(p.stock)  || 0;
    console.log(`[Orders/validateStock] "${p.name}" — stock: ${stock}, requested: ${reqQty}`);
    if (stock <= 0)      errors.push(`"${p.name}" is out of stock`);
    else if (reqQty > stock) errors.push(`"${p.name}" — only ${stock} available (requested ${reqQty})`);
  }
  return { ok: errors.length === 0, errors };
}

/* ── Stock reduction ──────────────────────────────────────────── */
async function reduceStock(items, orderId) {
  const results = [];
  for (const item of items) {
    const productId = item.product || item.id || item._id;
    const qty       = Number(item.qty) || 1;
    if (!productId) { results.push({ error: 'No product ID' }); continue; }
    try {
      const updated = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      ).select('name stock').lean();
      if (!updated) {
        const current = await Product.findById(productId).select('name stock').lean();
        const msg = current
          ? `Insufficient stock for "${current.name}" (stock: ${current.stock}, needed: ${qty})`
          : `Product ${productId} not found`;
        console.error(`[Orders/reduceStock] ❌ ${msg} | Order: ${orderId}`);
        results.push({ id: productId, ok: false, error: msg });
        continue;
      }
      const stockAfter = updated.stock;
      console.log(`[Orders/reduceStock] ✅ "${updated.name}" | ${stockAfter + qty} → ${stockAfter} | Order: ${orderId}`);
      results.push({ id: productId, ok: true, name: updated.name, stockAfter });
      if (LOW_STOCK_EMAIL_AT.includes(stockAfter)) {
        sendLowStockAlertEmail({ productId, productName: updated.name, stockAfter, status: stockStatus(stockAfter), orderId: String(orderId) })
          .catch(e => console.warn('[Orders/reduceStock] Low-stock email failed:', e.message));
      }
    } catch (err) {
      console.error(`[Orders/reduceStock] ERROR on item ${productId}:`, err.message);
      results.push({ id: productId, ok: false, error: err.message });
    }
  }
  return { ok: results.every(r => r.ok !== false), results };
}

/* ── Build email payload from order doc ──────────────────────── */
function buildEmailPayload(order) {
  return {
    customerName:    order.shipping?.fullName  || 'Customer',
    customerEmail:   order.shipping?.email     || '',
    orderId:         order._id,
    items:           order.items || [],
    totalAmount:     order.total || 0,
    shippingAddress: [order.shipping?.address, order.shipping?.city, order.shipping?.state, order.shipping?.zip]
      .filter(Boolean).join(', '),
    isCOD:           order.isCOD,
    codAdvancePaid:  order.codAdvancePaid,
    // Shipping details (filled in when shipped)
    courierName:     order.shippingInfo?.courierName   || '',
    trackingId:      order.shippingInfo?.trackingId    || '',
    trackingUrl:     order.shippingInfo?.trackingUrl   || '',
    estimatedDate:   order.shippingInfo?.estimatedDate || '',
  };
}

/* ══════════════════════════════════════════════════════════════════
   POST /api/orders  — create order  (ORIGINAL — FULLY PRESERVED)
══════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    const cartItems = req.body.items || [];
    if (!cartItems.length) return res.status(400).json({ error: 'Order has no items' });

    const stockCheck = await validateStock(cartItems);
    if (!stockCheck.ok) {
      console.warn('[Orders] ❌ Stock validation failed:', stockCheck.errors);
      return res.status(409).json({ error: 'Stock validation failed', stockErrors: stockCheck.errors, message: stockCheck.errors.join('; ') });
    }
    console.log('[Orders] ✅ Stock validated — creating order...');

    const order = await Order.create(req.body);
    console.log(`[Orders] ✅ Order created: ${order._id}`);

    reduceStock(cartItems, order._id).catch(e => console.error('[Orders] Stock reduce background error:', e.message));

    sendOrderConfirmationEmail({
      customerName:    order.shipping?.fullName  || 'Customer',
      customerEmail:   order.shipping?.email     || '',
      orderId:         order._id,
      items:           order.items || [],
      totalAmount:     order.total || 0,
      shippingAddress: [order.shipping?.address, order.shipping?.city, order.shipping?.state, order.shipping?.zip].filter(Boolean).join(', '),
      isCOD:           order.isCOD,
      codAdvancePaid:  order.codAdvancePaid,
    }).catch(e => console.error('[Orders] Confirmation email failed:', e.message));

    const code  = (req.body.coupon || '').trim().toUpperCase();
    const email = req.body.shipping?.email || null;
    if (code) {
      Coupon.findOneAndUpdate({ code }, { used: true, usedBy: email }).catch(() => {});
      SpinLead.findOneAndUpdate({ coupon: code }, { used: true }).catch(() => {});
    }

    res.json(order);
  } catch (err) {
    console.error('[Orders] POST / error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /api/orders  — all orders (admin)  (ORIGINAL — PRESERVED)
══════════════════════════════════════════════════════════════════ */
router.get('/', async (_, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /api/orders/:id  — single order (NEW — for customer tracking)
══════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   PUT /api/orders/:id  — update order (ENHANCED)
   ──────────────────────────────────────────────────────────────────
   NEW behaviour when status === 'shipped':
     1. Requires courierName + trackingId in body
     2. Saves shippingInfo subdoc to order
     3. Sends premium shipping email to customer

   All other status changes trigger appropriate automated emails.
   Original update logic preserved.
══════════════════════════════════════════════════════════════════ */
router.put('/:id', async (req, res) => {
  try {
    const { status, courierName, trackingId, trackingUrl, estimatedDate, cancellationNote, ...rest } = req.body;

    /* ── Build the update payload ─────────────────────────────── */
    const updatePayload = { ...rest };
    if (status) updatePayload.status = status;

    /* ── Shipping details: save when provided ─────────────────── */
    if (status === 'shipped') {
      if (!courierName || !trackingId) {
        return res.status(400).json({
          error: 'Courier name and tracking ID are required when marking order as shipped.'
        });
      }
      updatePayload.shippingInfo = {
        courierName:   (courierName || '').trim(),
        trackingId:    (trackingId  || '').trim(),
        trackingUrl:   (trackingUrl || '').trim(),
        estimatedDate: (estimatedDate || '').trim(),
        shippedAt:     new Date(),
      };
    }

    if (status === 'out_for_delivery') {
      updatePayload['shippingInfo.outForDeliveryAt'] = new Date();
    }

    if (status === 'delivered') {
      updatePayload['shippingInfo.deliveredAt'] = new Date();
    }

    if (status === 'cancelled' && cancellationNote) {
      updatePayload['shippingInfo.cancellationNote'] = cancellationNote;
    }

    /* ── Persist update ───────────────────────────────────────── */
    const updated = await Order.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    console.log(`[Orders] PUT /${req.params.id} → status: ${status || '(unchanged)'}`);

    /* ── Send automated emails based on new status ─────────────── */
    const payload = buildEmailPayload(updated);
    if (!payload.customerEmail) {
      console.warn(`[Orders] No email on order ${updated._id} — skipping status email`);
    } else {
      switch (status) {
        case 'shipped':
          sendShippedEmail(payload)
            .catch(e => console.error('[Orders] Shipped email failed:', e.message));
          break;
        case 'out_for_delivery':
          sendOutForDeliveryEmail(payload)
            .catch(e => console.error('[Orders] OFD email failed:', e.message));
          break;
        case 'delivered':
          sendDeliveredEmail(payload)
            .catch(e => console.error('[Orders] Delivered email failed:', e.message));
          break;
        case 'cancelled':
          sendCancelledEmail({ ...payload, cancellationNote: cancellationNote || '' })
            .catch(e => console.error('[Orders] Cancelled email failed:', e.message));
          break;
        default:
          break; // pending / processing — no email
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('[Orders] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/orders/:id  — delete order (ORIGINAL — PRESERVED)
══════════════════════════════════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
