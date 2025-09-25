'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert categories directly using raw SQL to avoid model validation issues
    await queryInterface.bulkInsert('categories', [
      {
        name: 'Hospitality Supplies',
        slug: 'hospitality-supplies',
        parent_id: null,
        path: '',
        level: 0,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Healthcare Supplies',
        slug: 'healthcare-supplies',
        parent_id: null,
        path: '',
        level: 0,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Hotel Amenities',
        slug: 'hotel-amenities',
        parent_id: 1,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Restaurant Supplies',
        slug: 'restaurant-supplies',
        parent_id: 1,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Cleaning Supplies',
        slug: 'cleaning-supplies',
        parent_id: 1,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Medical Equipment',
        slug: 'medical-equipment',
        parent_id: 2,
        path: 'healthcare-supplies',
        level: 1,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Personal Care',
        slug: 'personal-care',
        parent_id: 2,
        path: 'healthcare-supplies',
        level: 1,
        is_active: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert sample products
    await queryInterface.bulkInsert('products', [
      {
        title: 'Premium Cotton Bath Towels',
        slug: 'premium-cotton-bath-towels',
        sku: 'TOWEL-001',
        short_desc: 'Luxurious 100% cotton bath towels for premium hotel experience',
        long_desc: 'These premium cotton bath towels are made from 100% Egyptian cotton, providing exceptional softness and absorbency. Perfect for luxury hotels and resorts.',
        brand: 'Luxury Linens',
        category_id: 3, // Hotel Amenities
        price: 25.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: JSON.stringify(['Organic Cotton', 'Fair Trade']),
        meta: JSON.stringify({
          material: '100% Egyptian Cotton',
          weight: '600 GSM',
          dimensions: '30" x 54"',
          care_instructions: 'Machine wash cold, tumble dry low'
        }),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Eco-Friendly Shampoo Bottles',
        slug: 'eco-friendly-shampoo-bottles',
        sku: 'SHAMPOO-002',
        short_desc: 'Biodegradable shampoo bottles for sustainable hospitality',
        long_desc: 'Made from recycled materials, these shampoo bottles are fully biodegradable and perfect for eco-conscious hotels.',
        brand: 'Green Hotel',
        category_id: 3, // Hotel Amenities
        price: 8.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: JSON.stringify(['Biodegradable', 'Recycled Materials']),
        meta: JSON.stringify({
          material: 'Recycled Plastic',
          capacity: '50ml',
          biodegradable: true
        }),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Stainless Steel Cutlery Set',
        slug: 'stainless-steel-cutlery-set',
        sku: 'CUTLERY-004',
        short_desc: 'Professional grade stainless steel cutlery for restaurants',
        long_desc: 'High-quality 18/10 stainless steel cutlery set designed for commercial use. Durable and dishwasher safe.',
        brand: 'ProChef',
        category_id: 4, // Restaurant Supplies
        price: 12.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: JSON.stringify(['Recyclable']),
        meta: JSON.stringify({
          material: '18/10 Stainless Steel',
          pieces: 24,
          dishwasher_safe: true
        }),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Digital Thermometer',
        slug: 'digital-thermometer',
        sku: 'THERMO-008',
        short_desc: 'Accurate digital thermometer for medical use',
        long_desc: 'Professional-grade digital thermometer with fast readings and high accuracy. Perfect for medical facilities.',
        brand: 'MedTech Pro',
        category_id: 6, // Medical Equipment
        price: 35.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: JSON.stringify(['BPA-Free']),
        meta: JSON.stringify({
          accuracy: '±0.1°C',
          reading_time: '10 seconds',
          memory: 'Last 10 readings',
          waterproof: true
        }),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Antibacterial Hand Sanitizer',
        slug: 'antibacterial-hand-sanitizer',
        sku: 'SANITIZER-010',
        short_desc: 'Alcohol-based hand sanitizer for effective germ protection',
        long_desc: 'Fast-acting alcohol-based hand sanitizer that kills 99.9% of germs. Perfect for healthcare and hospitality settings.',
        brand: 'Safe Hands',
        category_id: 7, // Personal Care
        price: 6.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: JSON.stringify(['Non-Toxic']),
        meta: JSON.stringify({
          alcohol_content: '70%',
          volume: '8 fl oz',
          kills_germs: '99.9%',
          fragrance_free: true
        }),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insert inventory records
    await queryInterface.bulkInsert('inventory', [
      {
        product_id: 1,
        quantity: 50,
        low_stock_threshold: 5,
        in_stock: true,
        updated_at: new Date()
      },
      {
        product_id: 2,
        quantity: 100,
        low_stock_threshold: 5,
        in_stock: true,
        updated_at: new Date()
      },
      {
        product_id: 3,
        quantity: 25,
        low_stock_threshold: 5,
        in_stock: true,
        updated_at: new Date()
      },
      {
        product_id: 4,
        quantity: 75,
        low_stock_threshold: 5,
        in_stock: true,
        updated_at: new Date()
      },
      {
        product_id: 5,
        quantity: 200,
        low_stock_threshold: 5,
        in_stock: true,
        updated_at: new Date()
      }
    ]);

    // Insert product images
    await queryInterface.bulkInsert('product_images', [
      {
        product_id: 1,
        s3_key: 'products/premium-cotton-bath-towels/main.jpg',
        url: 'https://example-bucket.s3.amazonaws.com/products/premium-cotton-bath-towels/main.jpg',
        alt: 'Premium Cotton Bath Towels - Main Image',
        position: 0,
        width: 800,
        height: 600,
        created_at: new Date()
      },
      {
        product_id: 2,
        s3_key: 'products/eco-friendly-shampoo-bottles/main.jpg',
        url: 'https://example-bucket.s3.amazonaws.com/products/eco-friendly-shampoo-bottles/main.jpg',
        alt: 'Eco-Friendly Shampoo Bottles - Main Image',
        position: 0,
        width: 800,
        height: 600,
        created_at: new Date()
      },
      {
        product_id: 3,
        s3_key: 'products/stainless-steel-cutlery-set/main.jpg',
        url: 'https://example-bucket.s3.amazonaws.com/products/stainless-steel-cutlery-set/main.jpg',
        alt: 'Stainless Steel Cutlery Set - Main Image',
        position: 0,
        width: 800,
        height: 600,
        created_at: new Date()
      },
      {
        product_id: 4,
        s3_key: 'products/digital-thermometer/main.jpg',
        url: 'https://example-bucket.s3.amazonaws.com/products/digital-thermometer/main.jpg',
        alt: 'Digital Thermometer - Main Image',
        position: 0,
        width: 800,
        height: 600,
        created_at: new Date()
      },
      {
        product_id: 5,
        s3_key: 'products/antibacterial-hand-sanitizer/main.jpg',
        url: 'https://example-bucket.s3.amazonaws.com/products/antibacterial-hand-sanitizer/main.jpg',
        alt: 'Antibacterial Hand Sanitizer - Main Image',
        position: 0,
        width: 800,
        height: 600,
        created_at: new Date()
      }
    ]);

    console.log('Demo data created successfully!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('product_images', null, {});
    await queryInterface.bulkDelete('inventory', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    console.log('Demo data removed successfully!');
  }
};
