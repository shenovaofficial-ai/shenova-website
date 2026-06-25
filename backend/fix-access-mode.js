// fix-access-mode.js
// One-time script: makes all existing Cloudinary assets in shenova/images
// and shenova/videos folders publicly accessible (access_mode: public).
// Run with: node fix-access-mode.js
//
// Requires the same env vars as your server: CLOUDINARY_CLOUD_NAME,
// CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (loaded from .env in project root).

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDERS = ['shenova/images', 'shenova/videos'];

async function fixFolder(folderPrefix, resourceType) {
  let nextCursor = undefined;
  let totalFixed = 0;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: resourceType,
      prefix: folderPrefix,
      max_results: 500,
      next_cursor: nextCursor,
    });

    const publicIds = result.resources.map(r => r.public_id);

    if (publicIds.length > 0) {
      // update_access_mode works in batches; Cloudinary allows up to ~100 per call safely
      const batchSize = 100;
      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        await cloudinary.api.update_access_mode('public', batch, {
          resource_type: resourceType,
          type: 'upload',
        });
        totalFixed += batch.length;
        console.log(`  ✓ Fixed ${batch.length} ${resourceType}(s) in ${folderPrefix} (running total: ${totalFixed})`);
      }
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  console.log(`Done with ${folderPrefix}: ${totalFixed} assets set to public.\n`);
}

(async () => {
  try {
    console.log('Starting Cloudinary access_mode fix...\n');
    await fixFolder('shenova/images', 'image');
    await fixFolder('shenova/videos', 'video');
    console.log('All done! Refresh your site — images/videos should load now.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();