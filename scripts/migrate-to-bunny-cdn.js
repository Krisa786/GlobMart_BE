#!/usr/bin/env node

/**
 * Migration Script: Clean up old S3 images and prepare for Bunny CDN
 * 
 * This script will:
 * 1. Remove all existing product images from the database
 * 2. Clean up any orphaned files (optional)
 * 3. Prepare the system for fresh Bunny CDN uploads
 * 
 * Run with: node scripts/migrate-to-bunny-cdn.js
 */

require('dotenv').config();
const { ProductImage, Product } = require('../src/database/models');
const bunnyCDNService = require('../src/services/BunnyCDNService');
const { logger } = require('../src/middleware/errorHandler');

async function migrateToBunnyCDN() {
  console.log('🔄 Starting migration to Bunny CDN...\n');

  try {
    // Step 1: Check Bunny CDN configuration
    console.log('1️⃣ Checking Bunny CDN configuration...');
    const isConfigured = bunnyCDNService.isConfigured();
    
    if (!isConfigured) {
      console.log('❌ Bunny CDN is not properly configured.');
      console.log('Please set the following environment variables:');
      console.log('- STORAGE_URL');
      console.log('- STORAGE_SERVER_BASE_URL');
      console.log('- STORAGE_SERVER_ACCESS_KEY');
      return;
    }
    
    console.log('✅ Bunny CDN configuration is valid');

    // Step 2: Test Bunny CDN connection
    console.log('\n2️⃣ Testing Bunny CDN connection...');
    const connectionTest = await bunnyCDNService.testConnection();
    
    if (!connectionTest.success) {
      console.log('❌ Failed to connect to Bunny CDN');
      console.log(`Error: ${connectionTest.error}`);
      return;
    }
    
    console.log('✅ Bunny CDN connection successful');

    // Step 3: Get current image statistics
    console.log('\n3️⃣ Analyzing current image data...');
    const totalImages = await ProductImage.count();
    const productsWithImages = await Product.count({
      include: [{
        model: ProductImage,
        as: 'images',
        required: true
      }]
    });

    console.log(`   Total images in database: ${totalImages}`);
    console.log(`   Products with images: ${productsWithImages}`);

    if (totalImages === 0) {
      console.log('✅ No images to migrate. Database is already clean.');
      return;
    }

    // Step 4: Show sample of current image data
    console.log('\n4️⃣ Sample of current image data:');
    const sampleImages = await ProductImage.findAll({
      limit: 5,
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'title', 'slug']
      }]
    });

    sampleImages.forEach((image, index) => {
      console.log(`   ${index + 1}. Product: ${image.product?.title || 'Unknown'}`);
      console.log(`      s3_key: ${image.s3_key}`);
      console.log(`      url: ${image.url}`);
      console.log(`      size_variant: ${image.size_variant}`);
      console.log('');
    });

    // Step 5: Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL existing product images from the database.');
    console.log('   This action cannot be undone.');
    console.log('');
    console.log('   The following will be deleted:');
    console.log(`   - ${totalImages} image records`);
    console.log(`   - All image associations for ${productsWithImages} products`);
    console.log('');
    console.log('   After deletion, you will need to:');
    console.log('   1. Upload new images through the admin panel');
    console.log('   2. Images will be stored on Bunny CDN');
    console.log('   3. New URLs will be generated automatically');
    console.log('');

    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with the deletion
    console.log('🗑️  Proceeding with image deletion...');

    // Step 6: Delete all product images
    const deletedCount = await ProductImage.destroy({
      where: {},
      force: true // Hard delete (not soft delete)
    });

    console.log(`✅ Deleted ${deletedCount} image records from database`);

    // Step 7: Verify cleanup
    console.log('\n7️⃣ Verifying cleanup...');
    const remainingImages = await ProductImage.count();
    const productsWithImagesAfter = await Product.count({
      include: [{
        model: ProductImage,
        as: 'images',
        required: true
      }]
    });

    console.log(`   Remaining images: ${remainingImages}`);
    console.log(`   Products with images: ${productsWithImagesAfter}`);

    if (remainingImages === 0) {
      console.log('✅ Database cleanup completed successfully');
    } else {
      console.log('⚠️  Some images may still remain in the database');
    }

    // Step 8: Test Bunny CDN upload
    console.log('\n8️⃣ Testing Bunny CDN upload capability...');
    
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    const testKey = 'migration-test/connection-test.png';
    const uploadResult = await bunnyCDNService.uploadFile(
      testImageBuffer,
      testKey,
      'image/png',
      { test: 'migration', timestamp: new Date().toISOString() }
    );

    console.log('✅ Test upload successful');
    console.log(`   Test URL: ${uploadResult.url}`);

    // Clean up test file
    await bunnyCDNService.deleteFile(testKey);
    console.log('✅ Test file cleaned up');

    // Step 9: Final summary
    console.log('\n🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to the admin panel');
    console.log('2. Navigate to Products');
    console.log('3. Edit each product');
    console.log('4. Upload new images using the image upload feature');
    console.log('5. Images will be automatically stored on Bunny CDN');
    console.log('6. New URLs will be generated and stored in the database');
    console.log('');
    console.log('🔗 Bunny CDN Configuration:');
    console.log(`   Storage URL: ${process.env.STORAGE_URL}`);
    console.log(`   CDN URL: ${process.env.STORAGE_SERVER_BASE_URL}`);
    console.log(`   Access Key: ${process.env.STORAGE_SERVER_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);

  } catch (error) {
    logger.error('Migration failed:', {
      error: error.message,
      stack: error.stack
    });
    
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateToBunnyCDN().catch(error => {
  console.error('❌ Migration failed with error:', error.message);
  process.exit(1);
});
