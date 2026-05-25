/**
 * routes/orders.js — SHENOVA Order Routes
 * ==========================================
 * CHANGES FROM ORIGINAL:
 *   1. Added backend stock validation BEFORE order creation (prevents
 *      overselling even if frontend is bypassed).
 *   2. Added atomic stock reduction AFTER successful order creation.
 *   3. Added optional low-stock admin email alert after reduction.
 *   4. Mixed import/require fixed — now pure CommonJS.
 *   5. All original logic (coupons, email confirmation) preserved.
 */

const router   = require('express').Router();
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const Coupon   = require('../models/Coupon');
const SpinLead = require('../models/SpinLead');

/* ── Email service (CommonJS-safe) ─────────────────────────────── */
let sendOrderConfirmationEmail = async () => {};
let sendLowStockAlertEmail     = async () => {};
try {
  const emailSvc = require('../services/emailService');
  if (emailSvc.sendOrderConfirmationEmail) sendOrderConfirmationEmail = emailSvc.sendOrderConfirmationEmail;
  if (emailSvc.sendLowStockAlertEmail)     sendLowStockAlertEmail     = emailSvc.sendLowStockAlertEmail;
} catch (e) {
  console.warn('[Orders] emailService not loaded:', e.message);
}

/* ── Stock thresholds ─────────────────────────────────────────── */
const LOW_STOCK_THRESHOLD = 5;  // <= 5 = low stock
const LOW_STOCK_EMAIL_AT  = [5, 2, 0]; // alert admin at these levels

/* ══════════════════════════════════════════════════════════════════
   Helper: derive stock status string
══════════════════════════════════════════════════════════════════ */
function stockStatus(qty) {
  if (qty <= 0)                   return 'out_of_stock';
  if (qty <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

/* ══════════════════════════════════════════════════════════════════
   Helper: validate stock for all items in a cart
   Returns { ok, errors[] }
══════════════════════════════════════════════════════════════════ */
async function validateStock(items) {
  const errors = [];

  for (const item of items) {
    const productId = item.product || item.id || item._id;
    if (!productId) {
      errors.push(`Item "${item.name || 'unknown'}" has no product ID`);
      continue;
    }

    const p = await Product.findById(productId).select('name stock').lean();
    if (!p) {
      errors.push(`Product "${item.name || productId}" not found`);
      continue;
    }

    const reqQty = Number(item.qty) || 1;
    const stock  = Number(p.stock)  || 0;

    console.log(`[Orders/validateStock] "${p.name}" — stock: ${stock}, requested: ${reqQty}`);

    if (stock <= 0) {
      errors.push(`"${p.name}" is out of stock`);
    } else if (reqQty > stock) {
      errors.push(`"${p.name}" — only ${stock} piece${stock > 1 ? 's' : ''} available (you requested ${reqQty})`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/* ══════════════════════════════════════════════════════════════════
   Helper: atomically reduce stock after order creation
   Uses $inc with $gte guard to prevent negative stock.
══════════════════════════════════════════════════════════════════ */
async function reduceStock(items, orderId) {
  const results = [];

  for (const item of items) {
    const productId = item.product || item.id || item._id;
    const qty       = Number(item.qty) || 1;

    if (!productId) {
      results.push({ error: 'No product ID' });
      continue;
    }

    try {
      const updated = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: qty } },  // atomic guard
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

      /* ── Optional low-stock admin email alert ── */
      if (LOW_STOCK_EMAIL_AT.includes(stockAfter)) {
        const status = stockStatus(stockAfter);
        console.log(`[Orders/reduceStock] 🔔 LOW STOCK ALERT — "${updated.name}" now at ${stockAfter} (${status})`);
        sendLowStockAlertEmail({
          productId,
          productName: updated.name,
          stockAfter,
          status,
          orderId: String(orderId)
        }).catch(e => console.warn('[Orders/reduceStock] Low-stock email failed (non-critical):', e.message));
      }

    } catch (err) {
      console.error(`[Orders/reduceStock] ERROR on item ${productId}:`, err.message);
      results.push({ id: productId, ok: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.ok !== false);
  console.log(`[Orders/reduceStock] Summary — Order: ${orderId} | allOk: ${allOk}`);
  return { ok: allOk, results };
}

/* ══════════════════════════════════════════════════════════════════
   POST /api/orders  — create order
   Flow:
     1. Validate stock  →  reject if insufficient (returns 409)
     2. Create order    →  if save fails, stock untouched
     3. Reduce stock    →  atomic; errors logged but non-blocking
     4. Send confirmation email (non-blocking)
     5. Mark coupon used (non-blocking)
══════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    /* ── 1. Pre-creation stock validation ───────────────────── */
    const cartItems = req.body.items || [];

    if (!cartItems.length) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    const stockCheck = await validateStock(cartItems);

    if (!stockCheck.ok) {
      console.warn('[Orders] ❌ Stock validation failed:', stockCheck.errors);
      return res.status(409).json({
        error: 'Stock validation failed',
        stockErrors: stockCheck.errors,
        message: stockCheck.errors.join('; ')
      });
    }

    console.log('[Orders] ✅ Stock validated — creating order...');

    /* ── 2. Create order ────────────────────────────────────── */
    const order = await Order.create(req.body);
    console.log(`[Orders] ✅ Order created: ${order._id}`);

    /* ── 3. Reduce stock (after successful order creation) ──── */
    reduceStock(cartItems, order._id).catch(e =>
      console.error('[Orders] Stock reduce background error:', e.message)
    );

    /* ── 4. Send order confirmation email (non-blocking) ───── */
    sendOrderConfirmationEmail({
      customerName:  order.shipping?.fullName  || 'Customer',
      customerEmail: order.shipping?.email     || '',
      orderId:       order._id,
      items:         order.items || [],
      totalAmount:   order.total || 0,
      shippingAddress: [
        order.shipping?.address,
        order.shipping?.city,
        order.shipping?.state,
        order.shipping?.zip
      ].filter(Boolean).join(', ')
    }).catch(e => console.error('[Orders] Confirmation email failed (non-critical):', e.message));

    /* ── 5. Mark coupon as used (non-blocking) ─────────────── */
    const code  = (req.body.coupon || '').trim().toUpperCase();
    const email = req.body.shipping?.email || null;
    if (code) {
      Coupon.findOneAndUpdate({ code }, { used: true, usedBy: email }).catch(() => {});
      SpinLead.findOneAndUpdate({ coupon: code }, { used: true }).catch(() => {});
    }

    /* ── Return saved order ─────────────────────────────────── */
    res.json(order);

  } catch (err) {
    console.error('[Orders] POST / error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /api/orders  — all orders (admin)
══════════════════════════════════════════════════════════════════ */
router.get('/', async (_, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   PUT /api/orders/:id  — update order (admin: change status etc.)
══════════════════════════════════════════════════════════════════ */
router.put('/:id', async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/orders/:id  — delete order (admin)
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