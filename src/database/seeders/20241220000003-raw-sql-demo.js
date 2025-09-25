'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Use raw SQL to insert data directly
    await queryInterface.sequelize.query(`
      INSERT INTO categories (name, slug, parent_id, path, level, is_active, created_by, updated_by, created_at, updated_at) VALUES
      ('Hospitality Supplies', 'hospitality-supplies', NULL, '', 0, 1, NULL, NULL, NOW(), NOW()),
      ('Healthcare Supplies', 'healthcare-supplies', NULL, '', 0, 1, NULL, NULL, NOW(), NOW()),
      ('Hotel Amenities', 'hotel-amenities', 1, 'hospitality-supplies', 1, 1, NULL, NULL, NOW(), NOW()),
      ('Restaurant Supplies', 'restaurant-supplies', 1, 'hospitality-supplies', 1, 1, NULL, NULL, NOW(), NOW()),
      ('Cleaning Supplies', 'cleaning-supplies', 1, 'hospitality-supplies', 1, 1, NULL, NULL, NOW(), NOW()),
      ('Medical Equipment', 'medical-equipment', 2, 'healthcare-supplies', 1, 1, NULL, NULL, NOW(), NOW()),
      ('Personal Care', 'personal-care', 2, 'healthcare-supplies', 1, 1, NULL, NULL, NOW(), NOW());
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO products (title, slug, sku, short_desc, long_desc, brand, category_id, price, currency, status, sustainability_badges, meta, created_by, updated_by, created_at, updated_at) VALUES
      ('Premium Cotton Bath Towels', 'premium-cotton-bath-towels', 'TOWEL-001', 'Luxurious 100% cotton bath towels for premium hotel experience', 'These premium cotton bath towels are made from 100% Egyptian cotton, providing exceptional softness and absorbency. Perfect for luxury hotels and resorts.', 'Luxury Linens', 3, 25.99, 'USD', 'published', '["Organic Cotton", "Fair Trade"]', '{"material": "100% Egyptian Cotton", "weight": "600 GSM", "dimensions": "30\\" x 54\\"", "care_instructions": "Machine wash cold, tumble dry low"}', NULL, NULL, NOW(), NOW()),
      ('Eco-Friendly Shampoo Bottles', 'eco-friendly-shampoo-bottles', 'SHAMPOO-002', 'Biodegradable shampoo bottles for sustainable hospitality', 'Made from recycled materials, these shampoo bottles are fully biodegradable and perfect for eco-conscious hotels.', 'Green Hotel', 3, 8.50, 'USD', 'published', '["Biodegradable", "Recycled Materials"]', '{"material": "Recycled Plastic", "capacity": "50ml", "biodegradable": true}', NULL, NULL, NOW(), NOW()),
      ('Stainless Steel Cutlery Set', 'stainless-steel-cutlery-set', 'CUTLERY-004', 'Professional grade stainless steel cutlery for restaurants', 'High-quality 18/10 stainless steel cutlery set designed for commercial use. Durable and dishwasher safe.', 'ProChef', 4, 12.99, 'USD', 'published', '["Recyclable"]', '{"material": "18/10 Stainless Steel", "pieces": 24, "dishwasher_safe": true}', NULL, NULL, NOW(), NOW()),
      ('Digital Thermometer', 'digital-thermometer', 'THERMO-008', 'Accurate digital thermometer for medical use', 'Professional-grade digital thermometer with fast readings and high accuracy. Perfect for medical facilities.', 'MedTech Pro', 6, 35.50, 'USD', 'published', '["BPA-Free"]', '{"accuracy": "±0.1°C", "reading_time": "10 seconds", "memory": "Last 10 readings", "waterproof": true}', NULL, NULL, NOW(), NOW()),
      ('Antibacterial Hand Sanitizer', 'antibacterial-hand-sanitizer', 'SANITIZER-010', 'Alcohol-based hand sanitizer for effective germ protection', 'Fast-acting alcohol-based hand sanitizer that kills 99.9% of germs. Perfect for healthcare and hospitality settings.', 'Safe Hands', 7, 6.99, 'USD', 'published', '["Non-Toxic"]', '{"alcohol_content": "70%", "volume": "8 fl oz", "kills_germs": "99.9%", "fragrance_free": true}', NULL, NULL, NOW(), NOW());
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO inventory (product_id, quantity, low_stock_threshold, in_stock, updated_at) VALUES
      (1, 50, 5, 1, NOW()),
      (2, 100, 5, 1, NOW()),
      (3, 25, 5, 1, NOW()),
      (4, 75, 5, 1, NOW()),
      (5, 200, 5, 1, NOW());
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO product_images (product_id, s3_key, url, alt, position, width, height, created_at) VALUES
      (1, 'products/premium-cotton-bath-towels/main.jpg', 'https://example-bucket.s3.amazonaws.com/products/premium-cotton-bath-towels/main.jpg', 'Premium Cotton Bath Towels - Main Image', 0, 800, 600, NOW()),
      (2, 'products/eco-friendly-shampoo-bottles/main.jpg', 'https://example-bucket.s3.amazonaws.com/products/eco-friendly-shampoo-bottles/main.jpg', 'Eco-Friendly Shampoo Bottles - Main Image', 0, 800, 600, NOW()),
      (3, 'products/stainless-steel-cutlery-set/main.jpg', 'https://example-bucket.s3.amazonaws.com/products/stainless-steel-cutlery-set/main.jpg', 'Stainless Steel Cutlery Set - Main Image', 0, 800, 600, NOW()),
      (4, 'products/digital-thermometer/main.jpg', 'https://example-bucket.s3.amazonaws.com/products/digital-thermometer/main.jpg', 'Digital Thermometer - Main Image', 0, 800, 600, NOW()),
      (5, 'products/antibacterial-hand-sanitizer/main.jpg', 'https://example-bucket.s3.amazonaws.com/products/antibacterial-hand-sanitizer/main.jpg', 'Antibacterial Hand Sanitizer - Main Image', 0, 800, 600, NOW());
    `);

    console.log('Demo data created successfully using raw SQL!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DELETE FROM product_images');
    await queryInterface.sequelize.query('DELETE FROM inventory');
    await queryInterface.sequelize.query('DELETE FROM products');
    await queryInterface.sequelize.query('DELETE FROM categories');
    console.log('Demo data removed successfully!');
  }
};
