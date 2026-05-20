// ═══════════════════════════════════════════════════
//  SHENOVA · Story Controller
//  File: controllers/storyController.js
// ═══════════════════════════════════════════════════

const Story     = require('../models/Story');
const { cloudinary } = require('../middleware/storyUpload');

/* ─────────────────────────────────────────────────
   GET /api/stories
   Public — returns only non-expired stories,
   sorted by `order` ASC then createdAt ASC
───────────────────────────────────────────────── */
exports.getStories = async (req, res) => {
  try {
    const now = new Date();

    const stories = await Story
      .find({ expiresAt: { $gt: now } })
      .sort({ order: 1, createdAt: 1 })
      .lean({ virtuals: true });

    res.json({ success: true, stories });

  } catch (err) {
    console.error('[Story] getStories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────
   GET /api/stories/admin
   Admin — returns ALL stories including expired,
   with expiry timer info
───────────────────────────────────────────────── */
exports.getAdminStories = async (req, res) => {
  try {
    const stories = await Story
      .find({})
      .sort({ order: 1, createdAt: 1 })
      .lean({ virtuals: true });

    const now = Date.now();

    const enriched = stories.map(s => ({
      ...s,
      expired        : new Date(s.expiresAt) <= now,
      expiresInSecs  : Math.max(0, Math.floor((new Date(s.expiresAt) - now) / 1000)),
      expiresInLabel : formatExpiry(new Date(s.expiresAt), now),
    }));

    res.json({ success: true, stories: enriched });

  } catch (err) {
    console.error('[Story] getAdminStories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────
   POST /api/stories
   Admin — upload a new story
   Body (multipart/form-data):
     file      — image or video file (required)
     caption   — string (optional)
     ctaText   — string (optional)
     ctaLink   — string (optional)
     order     — number (optional, default 0)
───────────────────────────────────────────────── */
exports.createStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { caption = '', ctaText = '', ctaLink = '', order = 0 } = req.body;

    const isVideo = req.file.mimetype.startsWith('video/');

    const story = await Story.create({
      type         : isVideo ? 'video' : 'image',
      mediaUrl     : req.file.path,          // Cloudinary URL
      cloudinaryId : req.file.filename,      // Cloudinary public_id
      caption      : caption.trim(),
      ctaText      : ctaText.trim(),
      ctaLink      : ctaLink.trim(),
      order        : Number(order) || 0,
    });

    res.status(201).json({ success: true, story });

  } catch (err) {
    console.error('[Story] createStory error:', err);
    res.status(500).json({ success: false, message: 'Server error', detail: err.message });
  }
};

/* ─────────────────────────────────────────────────
   PUT /api/stories/:id
   Admin — update caption / CTA / order
───────────────────────────────────────────────── */
exports.updateStory = async (req, res) => {
  try {
    const { caption, ctaText, ctaLink, order } = req.body;

    const update = {};
    if (caption  !== undefined) update.caption  = caption.trim();
    if (ctaText  !== undefined) update.ctaText  = ctaText.trim();
    if (ctaLink  !== undefined) update.ctaLink  = ctaLink.trim();
    if (order    !== undefined) update.order    = Number(order);

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    res.json({ success: true, story });

  } catch (err) {
    console.error('[Story] updateStory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────
   DELETE /api/stories/:id
   Admin — delete story and its Cloudinary asset
───────────────────────────────────────────────── */
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found.' });

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(story.cloudinaryId, {
        resource_type: story.type === 'video' ? 'video' : 'image',
      });
    } catch (cdnErr) {
      console.warn('[Story] Cloudinary delete warning:', cdnErr.message);
      // Continue even if Cloudinary delete fails
    }

    await story.deleteOne();

    res.json({ success: true, message: 'Story deleted.' });

  } catch (err) {
    console.error('[Story] deleteStory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────
   PUT /api/stories/reorder
   Admin — reorder stories
   Body: { order: ['id1', 'id2', 'id3', ...] }
───────────────────────────────────────────────── */
exports.reorderStories = async (req, res) => {
  try {
    const { order } = req.body; // array of story _ids in desired order

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array of IDs.' });
    }

    const ops = order.map((id, idx) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: idx } },
      },
    }));

    await Story.bulkWrite(ops);

    res.json({ success: true, message: 'Stories reordered.' });

  } catch (err) {
    console.error('[Story] reorderStories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────
   POST /api/stories/:id/view
   Public — increment view counter
───────────────────────────────────────────────── */
exports.incrementView = async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
};

/* ─────────────────────────────────────────────────
   DELETE /api/stories/cleanup
   Admin / cron — manually purge expired stories
   (MongoDB TTL handles this automatically,
    but this gives you an on-demand endpoint)
───────────────────────────────────────────────── */
exports.cleanupExpired = async (req, res) => {
  try {
    const expired = await Story.find({ expiresAt: { $lte: new Date() } });

    // Delete Cloudinary assets
    await Promise.allSettled(
      expired.map(s =>
        cloudinary.uploader.destroy(s.cloudinaryId, {
          resource_type: s.type === 'video' ? 'video' : 'image',
        })
      )
    );

    const { deletedCount } = await Story.deleteMany({ expiresAt: { $lte: new Date() } });

    res.json({ success: true, deleted: deletedCount });

  } catch (err) {
    console.error('[Story] cleanupExpired error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Helpers ──────────────────────────────────────
function formatExpiry (expiresAt, now) {
  const ms   = expiresAt - now;
  if (ms <= 0) return 'Expired';
  const h    = Math.floor(ms / 3_600_000);
  const m    = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}