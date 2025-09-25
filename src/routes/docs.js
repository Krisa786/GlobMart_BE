const express = require('express');
const router = express.Router();
const openApiSpec = require('../docs/openapi');

/**
 * @route   GET /api/openapi.json
 * @desc    Get OpenAPI specification
 * @access  Public
 */
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiSpec);
});

/**
 * @route   GET /api/docs
 * @desc    Get API documentation (redirect to OpenAPI UI)
 * @access  Public
 */
router.get('/docs', (req, res) => {
  res.redirect(`https://petstore.swagger.io/?url=${req.protocol}://${req.get('host')}/api/openapi.json`);
});

module.exports = router;
