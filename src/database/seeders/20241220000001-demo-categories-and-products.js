'use strict';

const { Category, Product, ProductImage, Inventory } = require('../models');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create demo categories
    const hospitalityCategory = await Category.create({
      name: 'Hospitality Supplies',
      slug: 'hospitality-supplies',
      parent_id: null,
      path: '',
      level: 0,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    const healthcareCategory = await Category.create({
      name: 'Healthcare Supplies',
      slug: 'healthcare-supplies',
      parent_id: null,
      path: '',
      level: 0,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    // Create subcategories for hospitality
    const hotelAmenities = await Category.create({
      name: 'Hotel Amenities',
      slug: 'hotel-amenities',
      parent_id: hospitalityCategory.id,
      path: 'hospitality-supplies',
      level: 1,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    const restaurantSupplies = await Category.create({
      name: 'Restaurant Supplies',
      slug: 'restaurant-supplies',
      parent_id: hospitalityCategory.id,
      path: 'hospitality-supplies',
      level: 1,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    const cleaningSupplies = await Category.create({
      name: 'Cleaning Supplies',
      slug: 'cleaning-supplies',
      parent_id: hospitalityCategory.id,
      path: 'hospitality-supplies',
      level: 1,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    // Create subcategories for healthcare
    const medicalEquipment = await Category.create({
      name: 'Medical Equipment',
      slug: 'medical-equipment',
      parent_id: healthcareCategory.id,
      path: 'healthcare-supplies',
      level: 1,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    const personalCare = await Category.create({
      name: 'Personal Care',
      slug: 'personal-care',
      parent_id: healthcareCategory.id,
      path: 'healthcare-supplies',
      level: 1,
      is_active: true,
      created_by: null,
      updated_by: null
    }, {
      hooks: false // Disable hooks to prevent cascade updates
    });

    // Create demo products
    const products = [
      // Hotel Amenities
      {
        title: 'Premium Cotton Bath Towels',
        slug: 'premium-cotton-bath-towels',
        sku: 'TOWEL-001',
        short_desc: 'Luxurious 100% cotton bath towels for premium hotel experience',
        long_desc: 'These premium cotton bath towels are made from 100% Egyptian cotton, providing exceptional softness and absorbency. Perfect for luxury hotels and resorts.',
        brand: 'Luxury Linens',
        category_id: hotelAmenities.id,
        price: 25.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Organic Cotton', 'Fair Trade'],
        meta: {
          material: '100% Egyptian Cotton',
          weight: '600 GSM',
          dimensions: '30" x 54"',
          care_instructions: 'Machine wash cold, tumble dry low'
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Eco-Friendly Shampoo Bottles',
        slug: 'eco-friendly-shampoo-bottles',
        sku: 'SHAMPOO-002',
        short_desc: 'Biodegradable shampoo bottles for sustainable hospitality',
        long_desc: 'Made from recycled materials, these shampoo bottles are fully biodegradable and perfect for eco-conscious hotels.',
        brand: 'Green Hotel',
        category_id: hotelAmenities.id,
        price: 8.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Biodegradable', 'Recycled Materials'],
        meta: {
          material: 'Recycled Plastic',
          capacity: '50ml',
          biodegradable: true
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Luxury Bathrobes',
        slug: 'luxury-bathrobes',
        sku: 'BATHROBE-003',
        short_desc: 'Premium terry cloth bathrobes for spa and hotel use',
        long_desc: 'Ultra-soft terry cloth bathrobes with elegant design. Perfect for spa treatments and luxury hotel amenities.',
        brand: 'Spa Essentials',
        category_id: hotelAmenities.id,
        price: 45.00,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Organic Cotton'],
        meta: {
          material: '100% Cotton Terry',
          sizes: ['S', 'M', 'L', 'XL'],
          weight: '800 GSM'
        },
        created_by: null,
        updated_by: null
      },

      // Restaurant Supplies
      {
        title: 'Stainless Steel Cutlery Set',
        slug: 'stainless-steel-cutlery-set',
        sku: 'CUTLERY-004',
        short_desc: 'Professional grade stainless steel cutlery for restaurants',
        long_desc: 'High-quality 18/10 stainless steel cutlery set designed for commercial use. Durable and dishwasher safe.',
        brand: 'ProChef',
        category_id: restaurantSupplies.id,
        price: 12.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Recyclable'],
        meta: {
          material: '18/10 Stainless Steel',
          pieces: 24,
          dishwasher_safe: true
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Ceramic Dinner Plates',
        slug: 'ceramic-dinner-plates',
        sku: 'PLATES-005',
        short_desc: 'Elegant ceramic dinner plates for fine dining',
        long_desc: 'Beautiful white ceramic dinner plates with subtle rim design. Perfect for fine dining establishments.',
        brand: 'Fine Dining Co',
        category_id: restaurantSupplies.id,
        price: 18.75,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Lead-Free'],
        meta: {
          material: 'Ceramic',
          diameter: '10.5 inches',
          microwave_safe: true,
          dishwasher_safe: true
        },
        created_by: null,
        updated_by: null
      },

      // Cleaning Supplies
      {
        title: 'Eco-Friendly All-Purpose Cleaner',
        slug: 'eco-friendly-all-purpose-cleaner',
        sku: 'CLEANER-006',
        short_desc: 'Plant-based all-purpose cleaner for sustainable cleaning',
        long_desc: 'Made from natural plant extracts, this all-purpose cleaner is safe for the environment and effective on all surfaces.',
        brand: 'Green Clean',
        category_id: cleaningSupplies.id,
        price: 15.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Plant-Based', 'Biodegradable', 'Non-Toxic'],
        meta: {
          volume: '1 Gallon',
          ph_level: '7.0',
          biodegradable: true,
          non_toxic: true
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Microfiber Cleaning Cloths',
        slug: 'microfiber-cleaning-cloths',
        sku: 'CLOTHS-007',
        short_desc: 'High-quality microfiber cleaning cloths for streak-free cleaning',
        long_desc: 'Premium microfiber cleaning cloths that trap dirt and leave surfaces streak-free. Reusable and machine washable.',
        brand: 'Clean Pro',
        category_id: cleaningSupplies.id,
        price: 9.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Reusable'],
        meta: {
          material: 'Microfiber',
          pack_size: 12,
          reusable: true,
          machine_washable: true
        },
        created_by: null,
        updated_by: null
      },

      // Medical Equipment
      {
        title: 'Digital Thermometer',
        slug: 'digital-thermometer',
        sku: 'THERMO-008',
        short_desc: 'Accurate digital thermometer for medical use',
        long_desc: 'Professional-grade digital thermometer with fast readings and high accuracy. Perfect for medical facilities.',
        brand: 'MedTech Pro',
        category_id: medicalEquipment.id,
        price: 35.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['BPA-Free'],
        meta: {
          accuracy: '±0.1°C',
          reading_time: '10 seconds',
          memory: 'Last 10 readings',
          waterproof: true
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Blood Pressure Monitor',
        slug: 'blood-pressure-monitor',
        sku: 'BPMON-009',
        short_desc: 'Automatic blood pressure monitor with large display',
        long_desc: 'Easy-to-use automatic blood pressure monitor with large LCD display and memory function.',
        brand: 'HealthCare Plus',
        category_id: medicalEquipment.id,
        price: 89.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Energy Efficient'],
        meta: {
          cuff_size: '22-42 cm',
          memory: '99 readings',
          display: 'Large LCD',
          power: 'Battery/AC adapter'
        },
        created_by: null,
        updated_by: null
      },

      // Personal Care
      {
        title: 'Antibacterial Hand Sanitizer',
        slug: 'antibacterial-hand-sanitizer',
        sku: 'SANITIZER-010',
        short_desc: 'Alcohol-based hand sanitizer for effective germ protection',
        long_desc: 'Fast-acting alcohol-based hand sanitizer that kills 99.9% of germs. Perfect for healthcare and hospitality settings.',
        brand: 'Safe Hands',
        category_id: personalCare.id,
        price: 6.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Non-Toxic'],
        meta: {
          alcohol_content: '70%',
          volume: '8 fl oz',
          kills_germs: '99.9%',
          fragrance_free: true
        },
        created_by: null,
        updated_by: null
      },
      {
        title: 'Moisturizing Hand Cream',
        slug: 'moisturizing-hand-cream',
        sku: 'HANDCREAM-011',
        short_desc: 'Rich moisturizing hand cream for dry skin',
        long_desc: 'Intensive moisturizing hand cream with natural ingredients. Provides long-lasting hydration for dry, cracked hands.',
        brand: 'Natural Care',
        category_id: personalCare.id,
        price: 12.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Natural Ingredients', 'Cruelty-Free'],
        meta: {
          volume: '4 fl oz',
          ingredients: 'Natural',
          cruelty_free: true,
          hypoallergenic: true
        },
        created_by: null,
        updated_by: null
      }
    ];

    // Create products
    for (const productData of products) {
      const product = await Product.create(productData, {
        hooks: false // Disable hooks to prevent cascade updates
      });

      // Create inventory for each product
      await Inventory.create({
        product_id: product.id,
        quantity: Math.floor(Math.random() * 100) + 10, // Random quantity between 10-110
        low_stock_threshold: 5,
        in_stock: true
      }, {
        hooks: false // Disable hooks to prevent cascade updates
      });

      // Create sample product images
      await ProductImage.create({
        product_id: product.id,
        s3_key: `products/${product.slug}/main.jpg`,
        url: `https://example-bucket.s3.amazonaws.com/products/${product.slug}/main.jpg`,
        alt: `${product.title} - Main Image`,
        position: 0,
        width: 800,
        height: 600
      }, {
        hooks: false // Disable hooks to prevent cascade updates
      });

      // Add secondary image for some products
      if (Math.random() > 0.5) {
        await ProductImage.create({
          product_id: product.id,
          s3_key: `products/${product.slug}/secondary.jpg`,
          url: `https://example-bucket.s3.amazonaws.com/products/${product.slug}/secondary.jpg`,
          alt: `${product.title} - Secondary Image`,
          position: 1,
          width: 800,
          height: 600
        }, {
          hooks: false // Disable hooks to prevent cascade updates
        });
      }
    }

    console.log('Demo categories and products created successfully!');
  },

  async down(queryInterface, Sequelize) {
    // Delete all products first (due to foreign key constraints)
    await Product.destroy({ where: {}, force: true });

    // Delete all categories
    await Category.destroy({ where: {}, force: true });

    console.log('Demo categories and products removed successfully!');
  }
};
