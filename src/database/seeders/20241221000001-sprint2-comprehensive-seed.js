'use strict';

const { Category, Product, ProductImage, Inventory } = require('../models');
const { logger } = require('../../middleware/errorHandler');

/**
 * Comprehensive Sprint-2 Seeder
 * Creates realistic categories, products, and images for testing and demo purposes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Starting Sprint-2 comprehensive seeding...');

      // Create main categories with proper hierarchy
      const mainCategories = await this.createMainCategories();
      
      // Create subcategories
      const subcategories = await this.createSubcategories(mainCategories);
      
      // Create products with realistic data
      const products = await this.createProducts(subcategories);
      
      // Create inventory for all products
      await this.createInventory(products);
      
      // Create placeholder images for all products
      await this.createProductImages(products);

      logger.info('Sprint-2 comprehensive seeding completed successfully!');
      logger.info(`Created ${mainCategories.length} main categories, ${subcategories.length} subcategories, and ${products.length} products`);
    } catch (error) {
      logger.error('Sprint-2 seeding failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      logger.info('Removing Sprint-2 seeded data...');
      
      // Delete in reverse order due to foreign key constraints
      await ProductImage.destroy({ where: {}, force: true });
      await Inventory.destroy({ where: {}, force: true });
      await Product.destroy({ where: {}, force: true });
      await Category.destroy({ where: {}, force: true });
      
      logger.info('Sprint-2 seeded data removed successfully!');
    } catch (error) {
      logger.error('Failed to remove Sprint-2 seeded data:', error);
      throw error;
    }
  },

  /**
   * Create main categories
   */
  async createMainCategories() {
    const mainCategories = [
      {
        name: 'Hospitality Supplies',
        slug: 'hospitality-supplies',
        description: 'Complete range of supplies for hotels, resorts, and hospitality businesses',
        parent_id: null,
        path: '',
        level: 0,
        is_active: true,
        created_by: null,
        updated_by: null
      },
      {
        name: 'Healthcare Supplies',
        slug: 'healthcare-supplies',
        description: 'Medical equipment and supplies for healthcare facilities',
        parent_id: null,
        path: '',
        level: 0,
        is_active: true,
        created_by: null,
        updated_by: null
      },
      {
        name: 'Wellness & Spa',
        slug: 'wellness-spa',
        description: 'Premium wellness and spa products for relaxation and rejuvenation',
        parent_id: null,
        path: '',
        level: 0,
        is_active: true,
        created_by: null,
        updated_by: null
      }
    ];

    const createdCategories = [];
    for (const categoryData of mainCategories) {
      const category = await Category.create(categoryData, { hooks: false });
      createdCategories.push(category);
    }

    return createdCategories;
  },

  /**
   * Create subcategories
   */
  async createSubcategories(mainCategories) {
    const hospitalityCategory = mainCategories.find(c => c.slug === 'hospitality-supplies');
    const healthcareCategory = mainCategories.find(c => c.slug === 'healthcare-supplies');
    const wellnessCategory = mainCategories.find(c => c.slug === 'wellness-spa');

    const subcategories = [
      // Hospitality subcategories
      {
        name: 'Hotel Amenities',
        slug: 'hotel-amenities',
        description: 'Essential amenities for guest rooms and suites',
        parent_id: hospitalityCategory.id,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true
      },
      {
        name: 'Restaurant & Dining',
        slug: 'restaurant-dining',
        description: 'Professional dining supplies and equipment',
        parent_id: hospitalityCategory.id,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true
      },
      {
        name: 'Cleaning & Maintenance',
        slug: 'cleaning-maintenance',
        description: 'Cleaning supplies and maintenance equipment',
        parent_id: hospitalityCategory.id,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true
      },
      {
        name: 'Bedding & Linens',
        slug: 'bedding-linens',
        description: 'Premium bedding and linen collections',
        parent_id: hospitalityCategory.id,
        path: 'hospitality-supplies',
        level: 1,
        is_active: true
      },

      // Healthcare subcategories
      {
        name: 'Medical Equipment',
        slug: 'medical-equipment',
        description: 'Professional medical devices and equipment',
        parent_id: healthcareCategory.id,
        path: 'healthcare-supplies',
        level: 1,
        is_active: true
      },
      {
        name: 'Personal Care',
        slug: 'personal-care',
        description: 'Personal hygiene and care products',
        parent_id: healthcareCategory.id,
        path: 'healthcare-supplies',
        level: 1,
        is_active: true
      },
      {
        name: 'Safety & Protection',
        slug: 'safety-protection',
        description: 'Safety equipment and protective gear',
        parent_id: healthcareCategory.id,
        path: 'healthcare-supplies',
        level: 1,
        is_active: true
      },

      // Wellness subcategories
      {
        name: 'Spa Treatments',
        slug: 'spa-treatments',
        description: 'Professional spa treatment products',
        parent_id: wellnessCategory.id,
        path: 'wellness-spa',
        level: 1,
        is_active: true
      },
      {
        name: 'Aromatherapy',
        slug: 'aromatherapy',
        description: 'Essential oils and aromatherapy products',
        parent_id: wellnessCategory.id,
        path: 'wellness-spa',
        level: 1,
        is_active: true
      },
      {
        name: 'Relaxation Accessories',
        slug: 'relaxation-accessories',
        description: 'Accessories for relaxation and meditation',
        parent_id: wellnessCategory.id,
        path: 'wellness-spa',
        level: 1,
        is_active: true
      }
    ];

    const createdSubcategories = [];
    for (const subcategoryData of subcategories) {
      const subcategory = await Category.create(subcategoryData, { hooks: false });
      createdSubcategories.push(subcategory);
    }

    return createdSubcategories;
  },

  /**
   * Create comprehensive product catalog
   */
  async createProducts(subcategories) {
    const products = [
      // Hotel Amenities
      {
        title: 'Luxury Egyptian Cotton Bath Towels',
        slug: 'luxury-egyptian-cotton-bath-towels',
        sku: 'TOWEL-EGYPT-001',
        short_desc: 'Premium 100% Egyptian cotton bath towels with exceptional softness and absorbency',
        long_desc: 'These luxurious bath towels are crafted from the finest Egyptian cotton, providing unmatched softness and superior absorbency. Perfect for luxury hotels and resorts seeking to provide guests with the ultimate comfort experience. Each towel is carefully woven to ensure durability and long-lasting quality.',
        brand: 'Luxury Linens Co.',
        category_id: subcategories.find(c => c.slug === 'hotel-amenities').id,
        price: 32.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Organic Cotton', 'Fair Trade Certified', 'OEKO-TEX Standard 100'],
        meta: {
          material: '100% Egyptian Cotton',
          weight: '650 GSM',
          dimensions: '30" x 54"',
          care_instructions: 'Machine wash cold, tumble dry low, do not bleach',
          color_options: ['White', 'Ivory', 'Light Gray'],
          certifications: ['OEKO-TEX Standard 100', 'Fair Trade']
        }
      },
      {
        title: 'Eco-Friendly Bamboo Shampoo Bottles',
        slug: 'eco-friendly-bamboo-shampoo-bottles',
        sku: 'SHAMPOO-BAMBOO-002',
        short_desc: 'Biodegradable bamboo shampoo bottles for sustainable hospitality',
        long_desc: 'Made from sustainable bamboo fiber, these shampoo bottles are fully biodegradable and perfect for eco-conscious hotels. The natural bamboo material provides a premium feel while being environmentally responsible.',
        brand: 'Green Hotel Solutions',
        category_id: subcategories.find(c => c.slug === 'hotel-amenities').id,
        price: 12.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Biodegradable', 'Sustainable Materials', 'Carbon Neutral'],
        meta: {
          material: 'Bamboo Fiber',
          capacity: '50ml',
          biodegradable: true,
          recyclable: true,
          certifications: ['FSC Certified', 'Carbon Neutral']
        }
      },
      {
        title: 'Premium Terry Cloth Bathrobes',
        slug: 'premium-terry-cloth-bathrobes',
        sku: 'BATHROBE-TERRY-003',
        short_desc: 'Ultra-soft terry cloth bathrobes with elegant design and superior comfort',
        long_desc: 'Crafted from premium terry cloth, these bathrobes offer exceptional comfort and style. Perfect for spa treatments and luxury hotel amenities, featuring a sophisticated design that enhances the guest experience.',
        brand: 'Spa Essentials Pro',
        category_id: subcategories.find(c => c.slug === 'hotel-amenities').id,
        price: 55.00,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Organic Cotton', 'Water-Based Dyes'],
        meta: {
          material: '100% Cotton Terry',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          weight: '850 GSM',
          color_options: ['White', 'Ivory', 'Light Blue'],
          features: ['Pocket', 'Belt Loop', 'Hood']
        }
      },

      // Restaurant & Dining
      {
        title: 'Professional Stainless Steel Cutlery Set',
        slug: 'professional-stainless-steel-cutlery-set',
        sku: 'CUTLERY-PRO-004',
        short_desc: 'Commercial-grade 18/10 stainless steel cutlery for professional kitchens',
        long_desc: 'High-quality 18/10 stainless steel cutlery set designed for commercial use. Features ergonomic handles and superior durability for high-volume restaurant operations.',
        brand: 'ProChef Equipment',
        category_id: subcategories.find(c => c.slug === 'restaurant-dining').id,
        price: 18.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Recyclable', 'Durable Design'],
        meta: {
          material: '18/10 Stainless Steel',
          pieces: 24,
          dishwasher_safe: true,
          commercial_grade: true,
          warranty: '2 years'
        }
      },
      {
        title: 'Fine Dining Ceramic Dinner Plates',
        slug: 'fine-dining-ceramic-dinner-plates',
        sku: 'PLATES-FINE-005',
        short_desc: 'Elegant bone china dinner plates with subtle rim design for fine dining',
        long_desc: 'Beautiful bone china dinner plates with sophisticated rim design. Perfect for fine dining establishments seeking to create an elegant dining experience.',
        brand: 'Fine Dining Collection',
        category_id: subcategories.find(c => c.slug === 'restaurant-dining').id,
        price: 24.75,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Lead-Free', 'Dishwasher Safe'],
        meta: {
          material: 'Bone China',
          diameter: '10.5 inches',
          microwave_safe: true,
          dishwasher_safe: true,
          color: 'White with Gold Rim'
        }
      },

      // Cleaning & Maintenance
      {
        title: 'Plant-Based All-Purpose Cleaner',
        slug: 'plant-based-all-purpose-cleaner',
        sku: 'CLEANER-PLANT-006',
        short_desc: 'Natural plant-based all-purpose cleaner for sustainable cleaning operations',
        long_desc: 'Made from natural plant extracts and essential oils, this all-purpose cleaner is safe for the environment and highly effective on all surfaces. Perfect for eco-conscious hospitality operations.',
        brand: 'Green Clean Solutions',
        category_id: subcategories.find(c => c.slug === 'cleaning-maintenance').id,
        price: 19.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Plant-Based', 'Biodegradable', 'Non-Toxic', 'Vegan'],
        meta: {
          volume: '1 Gallon',
          ph_level: '7.0',
          biodegradable: true,
          non_toxic: true,
          fragrance: 'Lemon Eucalyptus',
          certifications: ['EPA Safer Choice', 'Vegan Certified']
        }
      },
      {
        title: 'Premium Microfiber Cleaning Cloths',
        slug: 'premium-microfiber-cleaning-cloths',
        sku: 'CLOTHS-MICRO-007',
        short_desc: 'High-quality microfiber cleaning cloths for streak-free professional cleaning',
        long_desc: 'Premium microfiber cleaning cloths that trap dirt and leave surfaces streak-free. Reusable and machine washable, perfect for professional cleaning operations.',
        brand: 'Clean Pro Solutions',
        category_id: subcategories.find(c => c.slug === 'cleaning-maintenance').id,
        price: 14.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Reusable', 'Long-Lasting'],
        meta: {
          material: 'Premium Microfiber',
          pack_size: 12,
          reusable: true,
          machine_washable: true,
          color: 'Assorted Colors'
        }
      },

      // Medical Equipment
      {
        title: 'Professional Digital Thermometer',
        slug: 'professional-digital-thermometer',
        sku: 'THERMO-PRO-008',
        short_desc: 'Medical-grade digital thermometer with fast, accurate readings',
        long_desc: 'Professional-grade digital thermometer with fast readings and high accuracy. Perfect for medical facilities, clinics, and healthcare settings requiring reliable temperature monitoring.',
        brand: 'MedTech Professional',
        category_id: subcategories.find(c => c.slug === 'medical-equipment').id,
        price: 42.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['BPA-Free', 'Energy Efficient'],
        meta: {
          accuracy: '±0.1°C',
          reading_time: '8 seconds',
          memory: 'Last 20 readings',
          waterproof: true,
          display: 'Large LCD',
          certifications: ['FDA Approved', 'CE Marked']
        }
      },
      {
        title: 'Automatic Blood Pressure Monitor',
        slug: 'automatic-blood-pressure-monitor',
        sku: 'BPMON-AUTO-009',
        short_desc: 'Clinical-grade automatic blood pressure monitor with large display',
        long_desc: 'Easy-to-use automatic blood pressure monitor with large LCD display and comprehensive memory function. Ideal for healthcare facilities and wellness centers.',
        brand: 'HealthCare Plus',
        category_id: subcategories.find(c => c.slug === 'medical-equipment').id,
        price: 125.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Energy Efficient', 'Long Battery Life'],
        meta: {
          cuff_size: '22-42 cm',
          memory: '99 readings',
          display: 'Large LCD',
          power: 'Battery/AC adapter',
          accuracy: '±3 mmHg',
          certifications: ['FDA Approved', 'AAMI/ESH/ISO Validated']
        }
      },

      // Personal Care
      {
        title: 'Antibacterial Hand Sanitizer Gel',
        slug: 'antibacterial-hand-sanitizer-gel',
        sku: 'SANITIZER-GEL-010',
        short_desc: 'Alcohol-based hand sanitizer gel for effective germ protection',
        long_desc: 'Fast-acting alcohol-based hand sanitizer gel that kills 99.9% of germs. Perfect for healthcare and hospitality settings requiring effective hand hygiene.',
        brand: 'Safe Hands Pro',
        category_id: subcategories.find(c => c.slug === 'personal-care').id,
        price: 8.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Non-Toxic', 'Alcohol-Based'],
        meta: {
          alcohol_content: '70%',
          volume: '8 fl oz',
          kills_germs: '99.9%',
          fragrance_free: true,
          moisturizing: true,
          certifications: ['FDA Approved']
        }
      },
      {
        title: 'Intensive Moisturizing Hand Cream',
        slug: 'intensive-moisturizing-hand-cream',
        sku: 'HANDCREAM-INT-011',
        short_desc: 'Rich moisturizing hand cream with natural ingredients for dry skin',
        long_desc: 'Intensive moisturizing hand cream with natural ingredients and vitamin E. Provides long-lasting hydration for dry, cracked hands in professional settings.',
        brand: 'Natural Care Solutions',
        category_id: subcategories.find(c => c.slug === 'personal-care').id,
        price: 15.50,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Natural Ingredients', 'Cruelty-Free', 'Vegan'],
        meta: {
          volume: '4 fl oz',
          ingredients: 'Natural with Vitamin E',
          cruelty_free: true,
          hypoallergenic: true,
          fragrance: 'Unscented',
          certifications: ['Cruelty-Free', 'Vegan Certified']
        }
      },

      // Spa Treatments
      {
        title: 'Lavender Essential Oil Massage Blend',
        slug: 'lavender-essential-oil-massage-blend',
        sku: 'OIL-LAVENDER-012',
        short_desc: 'Premium lavender essential oil blend for therapeutic massage treatments',
        long_desc: 'Pure lavender essential oil blended with carrier oils for therapeutic massage treatments. Promotes relaxation and stress relief in spa environments.',
        brand: 'Spa Aromatherapy',
        category_id: subcategories.find(c => c.slug === 'spa-treatments').id,
        price: 28.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Organic', 'Pure Essential Oil'],
        meta: {
          volume: '2 fl oz',
          purity: '100% Pure',
          organic: true,
          carrier_oil: 'Jojoba',
          therapeutic_grade: true,
          certifications: ['USDA Organic', 'Therapeutic Grade']
        }
      },
      {
        title: 'Dead Sea Salt Body Scrub',
        slug: 'dead-sea-salt-body-scrub',
        sku: 'SCRUB-DEADSEA-013',
        short_desc: 'Luxurious Dead Sea salt body scrub for exfoliating spa treatments',
        long_desc: 'Premium Dead Sea salt body scrub enriched with natural minerals and essential oils. Perfect for exfoliating spa treatments and skin renewal.',
        brand: 'Luxury Spa Collection',
        category_id: subcategories.find(c => c.slug === 'spa-treatments').id,
        price: 35.00,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Natural Minerals', 'Cruelty-Free'],
        meta: {
          volume: '8 oz',
          ingredients: 'Dead Sea Salt, Essential Oils',
          skin_type: 'All Types',
          cruelty_free: true,
          packaging: 'Recyclable Glass Jar'
        }
      },

      // Aromatherapy
      {
        title: 'Eucalyptus Essential Oil Diffuser Blend',
        slug: 'eucalyptus-essential-oil-diffuser-blend',
        sku: 'OIL-EUCALYPTUS-014',
        short_desc: 'Refreshing eucalyptus essential oil blend for aromatherapy diffusers',
        long_desc: 'Pure eucalyptus essential oil blend perfect for aromatherapy diffusers. Creates a refreshing, invigorating atmosphere in wellness spaces.',
        brand: 'Aromatherapy Essentials',
        category_id: subcategories.find(c => c.slug === 'aromatherapy').id,
        price: 22.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Pure Essential Oil', 'Natural'],
        meta: {
          volume: '1 fl oz',
          purity: '100% Pure',
          organic: true,
          therapeutic_grade: true,
          benefits: ['Respiratory Support', 'Mental Clarity']
        }
      },

      // Relaxation Accessories
      {
        title: 'Meditation Cushion Set',
        slug: 'meditation-cushion-set',
        sku: 'CUSHION-MEDITATION-015',
        short_desc: 'Premium meditation cushion set for relaxation and mindfulness',
        long_desc: 'Comfortable meditation cushion set designed for relaxation and mindfulness practices. Perfect for wellness centers and spa relaxation areas.',
        brand: 'Zen Wellness',
        category_id: subcategories.find(c => c.slug === 'relaxation-accessories').id,
        price: 45.99,
        currency: 'USD',
        status: 'published',
        sustainability_badges: ['Natural Materials', 'Handcrafted'],
        meta: {
          material: 'Organic Cotton, Buckwheat Hulls',
          dimensions: '18" x 18" x 4"',
          color_options: ['Natural', 'Indigo', 'Sage Green'],
          handcrafted: true,
          removable_cover: true
        }
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await Product.create(productData, { hooks: false });
      createdProducts.push(product);
    }

    return createdProducts;
  },

  /**
   * Create inventory for all products
   */
  async createInventory(products) {
    for (const product of products) {
      // Generate realistic inventory quantities
      const baseQuantity = Math.floor(Math.random() * 200) + 50; // 50-250 units
      const lowStockThreshold = Math.floor(baseQuantity * 0.1); // 10% of base quantity
      
      await Inventory.create({
        product_id: product.id,
        quantity: baseQuantity,
        low_stock_threshold: lowStockThreshold,
        in_stock: baseQuantity > 0,
        reserved_quantity: 0,
        reorder_point: lowStockThreshold * 2
      }, { hooks: false });
    }
  },

  /**
   * Create placeholder images for all products
   */
  async createProductImages(products) {
    for (const product of products) {
      // Create main product image
      await ProductImage.create({
        product_id: product.id,
        s3_key: `products/${product.slug}/main.jpg`,
        url: `https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(product.title)}`,
        alt: `${product.title} - Main Product Image`,
        position: 0,
        width: 800,
        height: 600,
        is_primary: true
      }, { hooks: false });

      // Create secondary images for some products (70% chance)
      if (Math.random() > 0.3) {
        await ProductImage.create({
          product_id: product.id,
          s3_key: `products/${product.slug}/secondary-1.jpg`,
          url: `https://via.placeholder.com/800x600/059669/FFFFFF?text=${encodeURIComponent(product.title + ' - Detail')}`,
          alt: `${product.title} - Product Detail`,
          position: 1,
          width: 800,
          height: 600,
          is_primary: false
        }, { hooks: false });
      }

      // Create third image for some products (40% chance)
      if (Math.random() > 0.6) {
        await ProductImage.create({
          product_id: product.id,
          s3_key: `products/${product.slug}/secondary-2.jpg`,
          url: `https://via.placeholder.com/800x600/DC2626/FFFFFF?text=${encodeURIComponent(product.title + ' - Lifestyle')}`,
          alt: `${product.title} - Lifestyle Image`,
          position: 2,
          width: 800,
          height: 600,
          is_primary: false
        }, { hooks: false });
      }
    }
  }
};
