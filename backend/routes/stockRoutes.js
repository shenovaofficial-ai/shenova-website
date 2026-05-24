/**
 * stockRoutes.js — SHENOVA Stock Management Routes
 * ==========================================================
 * Mount in server.js with:  app.use('/api/stock', require('./routes/stockRoutes'));
 *
 * Endpoints:
 *   POST /api/stock/validate   — pre-payment cart validation
 *   POST /api/stock/reduce     — called ONLY after verified payment (from POST /api/orders)
 *   GET  /api/stock/:id        — public: get live stock for a single product
 * ==========================================================
 */

const router  = require('express').Router();
const mongoose = require('mongoose');

/* ── Re-use the Product model already registered in server.js ── */
const Product = () => mongoose.model('Product');

/* ══════════════════════════════════════════════════════════════
   POST /api/stock/validate
   Body: { items: [{ id, name, qty }] }
   Returns: { ok: true } or { ok: false, errors: [...] }
   Called from checkout BEFORE opening Razorpay modal.
══════════════════════════════════════════════════════════════ */
router.post('/validate', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, errors: ['No items provided'] });
    }

    const errors = [];

    for (const item of items) {
      const productId = item.id || item._id;
      if (!productId) { errors.push(`Item "${item.name}" has no product ID`); continue; }

      const p = await Product().findById(productId).select('name stock').lean();
      if (!p) { errors.push(`Product "${item.name}" not found`); continue; }

      const reqQty = Number(item.qty) || 1;

      console.log(`[Stock/validate] Product: "${p.name}" | stock: ${p.stock} | requested: ${reqQty}`);

      if (p.stock === 0) {
        errors.push(`"${p.name}" is out of stock`);
      } else if (reqQty > p.stock) {
        errors.push(`"${p.name}" — only ${p.stock} piece${p.stock > 1 ? 's' : ''} available (you requested ${reqQty})`);
      }
    }

    if (errors.length) {
      console.log('[Stock/validate] ❌ Validation failed:', errors);
      return res.status(409).json({ ok: false, errors });
    }

    console.log('[Stock/validate] ✅ All items in stock');
    return res.json({ ok: true });

  } catch (err) {
    console.error('[Stock/validate] ERROR:', err.message);
    res.status(500).json({ ok: false, errors: ['Server error during stock validation'] });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/stock/reduce
   Body: { items: [{ id, qty }], orderId }
   Called internally from POST /api/orders after order is saved.
   Uses atomic findOneAndUpdate with $inc to prevent overselling.
══════════════════════════════════════════════════════════════ */
router.post('/reduce', async (req, res) => {
  try {
    const { items, orderId } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: 'No items provided' });
    }

    const results = [];

    for (const item of items) {
      const productId = item.id || item._id;
      const qty = Number(item.qty) || 1;

      if (!productId) { results.push({ id: productId, error: 'No ID' }); continue; }

      try {
        /* Atomic update: only reduce if stock >= qty (prevents negative stock) */
        const updated = await Product().findOneAndUpdate(
          {
            _id:   productId,
            stock: { $gte: qty }          // guard: only update if enough stock
          },
          { $inc: { stock: -qty } },      // atomic decrement
          { new: true }
        ).select('name stock').lean();

        if (!updated) {
          /* Either product not found OR stock was insufficient */
          const current = await Product().findById(productId).select('name stock').lean();
          const msg = current
            ? `Insufficient stock for "${current.name}" (stock: ${current.stock}, needed: ${qty})`
            : `Product ${productId} not found`;

          console.error(`[Stock/reduce] ❌ ${msg} | Order: ${orderId}`);
          results.push({ id: productId, ok: false, error: msg });
        } else {
          console.log(`[Stock/reduce] ✅ "${updated.name}" | stock before: ${updated.stock + qty} → after: ${updated.stock} | Order: ${orderId}`);
          results.push({ id: productId, ok: true, name: updated.name, stockAfter: updated.stock });
        }
      } catch (itemErr) {
        console.error(`[Stock/reduce] ERROR on item ${productId}:`, itemErr.message);
        results.push({ id: productId, ok: false, error: itemErr.message });
      }
    }

    const allOk = results.every(r => r.ok !== false);
    console.log(`[Stock/reduce] Summary — Order: ${orderId} | allOk: ${allOk} |`, JSON.stringify(results));
    return res.json({ ok: allOk, results });

  } catch (err) {
    console.error('[Stock/reduce] ERROR:', err.message);
    res.status(500).json({ ok: false, error: 'Server error during stock reduction' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/stock/:id
   Returns live stock count for a single product.
   Used by product page for real-time display.
══════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const p = await Product().findById(req.params.id).select('stock').lean();
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ stock: p.stock });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

module.exports = router;
