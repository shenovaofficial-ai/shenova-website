/**
 * routes/stockRoutes.js — SHENOVA Stock Management Routes
 * ==========================================================
 * EXTENDED from original. All original endpoints preserved.
 * New additions:
 *   GET  /api/stock/admin/low    — admin: all low/out-of-stock products
 *   GET  /api/stock/admin/summary — admin: stock health summary counts
 *   (validate and reduce remain unchanged in behaviour)
 *
 * Mount: app.use('/api/stock', require('./routes/stockRoutes'));
 */

const router   = require('express').Router();
const mongoose = require('mongoose');

/* Re-use the Product model already registered in server.js */
const Product = () => mongoose.model('Product');

/* ── Stock thresholds (single source of truth) ─────────────────── */
const LOW_STOCK_THRESHOLD = 5;

function stockStatus(qty) {
  const n = Number(qty) || 0;
  if (n <= 0)                    return 'out_of_stock';
  if (n <= LOW_STOCK_THRESHOLD)  return 'low_stock';
  return 'in_stock';
}

/* ══════════════════════════════════════════════════════════════════
   GET /api/stock/admin/low
   Returns products that are low stock OR out of stock.
   Used by admin dashboard to show warnings.
   Query params:
     ?status=low_stock | out_of_stock | all  (default: all)
     ?limit=50
══════════════════════════════════════════════════════════════════ */
router.get('/admin/low', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let stockFilter;
    if (status === 'out_of_stock') {
      stockFilter = { stock: { $lte: 0 } };
    } else if (status === 'low_stock') {
      stockFilter = { stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } };
    } else {
      // default: all problematic (OOS + low)
      stockFilter = { stock: { $lte: LOW_STOCK_THRESHOLD } };
    }

    const products = await Product()
      .find(stockFilter)
      .select('name stock category images price')
      .sort({ stock: 1 })
      .limit(Number(limit))
      .lean();

    const enriched = products.map(p => ({
      ...p,
      stockStatus: stockStatus(p.stock)
    }));

    console.log(`[Stock/admin/low] Found ${enriched.length} products with low/zero stock`);
    res.json({ products: enriched, count: enriched.length, threshold: LOW_STOCK_THRESHOLD });

  } catch (err) {
    console.error('[Stock/admin/low] ERROR:', err.message);
    res.status(500).json({ error: 'Failed to fetch low-stock products' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /api/stock/admin/summary
   Returns counts: in_stock, low_stock, out_of_stock, total
   For admin dashboard health widget.
══════════════════════════════════════════════════════════════════ */
router.get('/admin/summary', async (req, res) => {
  try {
    const [outOfStock, lowStock, total] = await Promise.all([
      Product().countDocuments({ stock: { $lte: 0 } }),
      Product().countDocuments({ stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } }),
      Product().countDocuments({})
    ]);

    const inStock = total - outOfStock - lowStock;

    console.log(`[Stock/admin/summary] total: ${total} | in_stock: ${inStock} | low: ${lowStock} | oos: ${outOfStock}`);

    res.json({
      total,
      in_stock:    inStock,
      low_stock:   lowStock,
      out_of_stock: outOfStock,
      threshold:   LOW_STOCK_THRESHOLD
    });
  } catch (err) {
    console.error('[Stock/admin/summary] ERROR:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   POST /api/stock/validate
   Body: { items: [{ id, name, qty }] }
   Returns: { ok: true } or { ok: false, errors: [...] }
   Called from checkout BEFORE opening Razorpay modal.
   (UNCHANGED from original — preserved exactly)
══════════════════════════════════════════════════════════════════ */
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
      const stock  = Number(p.stock)  || 0;

      console.log(`[Stock/validate] Product: "${p.name}" | stock: ${stock} | requested: ${reqQty}`);

      if (stock <= 0) {
        errors.push(`"${p.name}" is out of stock`);
      } else if (reqQty > stock) {
        errors.push(`"${p.name}" — only ${stock} piece${stock > 1 ? 's' : ''} available (you requested ${reqQty})`);
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

/* ══════════════════════════════════════════════════════════════════
   POST /api/stock/reduce
   Body: { items: [{ id, qty }], orderId }
   NOTE: This is now primarily called internally from orders.js.
   Kept here for backward compatibility (e.g. manual admin triggers).
   (UNCHANGED from original — preserved exactly)
══════════════════════════════════════════════════════════════════ */
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
        const updated = await Product().findOneAndUpdate(
          { _id: productId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { new: true }
        ).select('name stock').lean();

        if (!updated) {
          const current = await Product().findById(productId).select('name stock').lean();
          const msg = current
            ? `Insufficient stock for "${current.name}" (stock: ${current.stock}, needed: ${qty})`
            : `Product ${productId} not found`;

          console.error(`[Stock/reduce] ❌ ${msg} | Order: ${orderId}`);
          results.push({ id: productId, ok: false, error: msg });
        } else {
          console.log(`[Stock/reduce] ✅ "${updated.name}" | ${updated.stock + qty} → ${updated.stock} | Order: ${orderId}`);
          results.push({ id: productId, ok: true, name: updated.name, stockAfter: updated.stock, stockStatus: stockStatus(updated.stock) });
        }
      } catch (itemErr) {
        console.error(`[Stock/reduce] ERROR on item ${productId}:`, itemErr.message);
        results.push({ id: productId, ok: false, error: itemErr.message });
      }
    }

    const allOk = results.every(r => r.ok !== false);
    console.log(`[Stock/reduce] Summary — Order: ${orderId} | allOk: ${allOk}`);
    return res.json({ ok: allOk, results });

  } catch (err) {
    console.error('[Stock/reduce] ERROR:', err.message);
    res.status(500).json({ ok: false, error: 'Server error during stock reduction' });
  }
});

/* ══════════════════════════════════════════════════════════════════
   GET /api/stock/:id
   Returns live stock + stockStatus for a single product.
   EXTENDED: now also returns stockStatus string.
   (Original: returned only { stock: N })
══════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const p = await Product().findById(req.params.id).select('stock').lean();
    if (!p) return res.status(404).json({ error: 'Product not found' });

    const stock  = Number(p.stock) || 0;
    const status = stockStatus(stock);

    res.json({ stock, stockStatus: status, threshold: LOW_STOCK_THRESHOLD });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

module.exports = router;