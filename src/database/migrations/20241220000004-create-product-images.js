'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      s3_key: {
        type: Sequelize.STRING(512),
        allowNull: false,
        comment: 'S3 object key for the image file'
      },
      url: {
        type: Sequelize.STRING(512),
        allowNull: false,
        comment: 'Public URL for the image'
      },
      alt: {
        type: Sequelize.STRING(160),
        allowNull: true,
        comment: 'Alt text for accessibility'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order/position of the image'
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image width in pixels'
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image height in pixels'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('product_images', ['product_id', 'position'], {
      name: 'product_images_product_id_position_index'
    });

    await queryInterface.addIndex('product_images', ['s3_key'], {
      name: 'product_images_s3_key_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_images');
  }
};
