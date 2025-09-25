'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('product_images', 'size_variant', {
      type: Sequelize.ENUM('original', 'thumb', 'medium', 'large'),
      allowNull: false,
      defaultValue: 'original',
      after: 'height'
    });

    await queryInterface.addColumn('product_images', 'file_size', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'size_variant'
    });

    await queryInterface.addColumn('product_images', 'content_type', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'file_size'
    });

    await queryInterface.addColumn('product_images', 'image_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'content_type'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('product_images', ['product_id', 'size_variant'], {
      name: 'product_images_product_id_size_variant_idx'
    });

    await queryInterface.addIndex('product_images', ['image_hash'], {
      name: 'product_images_image_hash_idx'
    });

    await queryInterface.addIndex('product_images', ['size_variant'], {
      name: 'product_images_size_variant_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('product_images', 'product_images_product_id_size_variant_idx');
    await queryInterface.removeIndex('product_images', 'product_images_image_hash_idx');
    await queryInterface.removeIndex('product_images', 'product_images_size_variant_idx');

    // Remove columns
    await queryInterface.removeColumn('product_images', 'image_hash');
    await queryInterface.removeColumn('product_images', 'content_type');
    await queryInterface.removeColumn('product_images', 'file_size');
    await queryInterface.removeColumn('product_images', 'size_variant');
  }
};
