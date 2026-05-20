// ═══════════════════════════════════════════════════
//  SHENOVA · Story Routes
//  File: routes/storyRoutes.js
//
//  Mount in your main server.js / app.js:
//    const storyRoutes = require('./routes/storyRoutes');
//    app.use('/api/stories', storyRoutes);
// ═══════════════════════════════════════════════════

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/storyController');
const { storyUpload } = require('../middleware/storyUpload');

/* ── Public routes ──────────────────────────────── */

// GET  /api/stories         → live stories (non-expired)
router.get('/', ctrl.getStories);

// POST /api/stories/:id/view → increment view count
router.post('/:id/view', ctrl.incrementView);

/* ── Admin routes ───────────────────────────────── */

// GET    /api/stories/admin     → all stories incl. expired
router.get('/admin', ctrl.getAdminStories);

// POST   /api/stories           → upload new story
// Field name must be "storyFile" (matches frontend FormData)
router.post('/', storyUpload.single('storyFile'), ctrl.createStory);

// PUT    /api/stories/reorder   → reorder (must be before /:id)
router.put('/reorder', ctrl.reorderStories);

// PUT    /api/stories/:id       → update caption / CTA / order
router.put('/:id', ctrl.updateStory);

// DELETE /api/stories/cleanup   → manual purge expired
router.delete('/cleanup', ctrl.cleanupExpired);

// DELETE /api/stories/:id       → delete one story
router.delete('/:id', ctrl.deleteStory);

module.exports = router;