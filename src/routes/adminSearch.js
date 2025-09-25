const express = require('express');
const { body, param, query } = require('express-validator');
const AdminSearchController = require('../controllers/AdminSearchController');
const { authenticateAccessToken, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and authorization to all admin search routes
router.use(authenticateAccessToken);
router.use(requireRoles('ADMIN'));

/**
 * @swagger
 * /api/admin/search/status:
 *   get:
 *     summary: Get search service status
 *     description: Get comprehensive status of search service, indexing, and queue
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isHealthy:
 *                       type: boolean
 *                     isReindexing:
 *                       type: boolean
 *                     indexStats:
 *                       type: object
 *                     queueStats:
 *                       type: object
 *                     counts:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/status', AdminSearchController.getSearchStatus);

/**
 * @swagger
 * /api/admin/search/reindex:
 *   post:
 *     summary: Trigger full reindex
 *     description: Start a full reindex of all products
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dryRun:
 *                 type: boolean
 *                 description: Show what would be indexed without actually indexing
 *               clearFirst:
 *                 type: boolean
 *                 description: Clear the index before reindexing
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Number of products to process in each batch
 *     responses:
 *       200:
 *         description: Reindexing started
 *       409:
 *         description: Reindexing already in progress
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/reindex', [
  body('dryRun').optional().isBoolean(),
  body('clearFirst').optional().isBoolean(),
  body('batchSize').optional().isInt({ min: 1, max: 1000 })
], AdminSearchController.triggerReindex);

/**
 * @swagger
 * /api/admin/search/index-product:
 *   post:
 *     summary: Index a specific product
 *     description: Add or update a specific product in the search index
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: ID of the product to index
 *               force:
 *                 type: boolean
 *                 description: Force indexing even if product doesn't meet criteria
 *     responses:
 *       200:
 *         description: Product indexing result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/index-product', [
  body('productId').isInt({ min: 1 }),
  body('force').optional().isBoolean()
], AdminSearchController.indexProduct);

/**
 * @swagger
 * /api/admin/search/index-product/{productId}:
 *   delete:
 *     summary: Remove a product from search index
 *     description: Remove a specific product from the search index
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to remove from index
 *     responses:
 *       200:
 *         description: Product removal result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete('/index-product/:productId', [
  param('productId').isInt({ min: 1 })
], AdminSearchController.removeProduct);

/**
 * @swagger
 * /api/admin/search/queue:
 *   get:
 *     summary: Get queue statistics
 *     description: Get statistics for indexing and removal queues
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         index:
 *                           type: object
 *                           properties:
 *                             waiting:
 *                               type: integer
 *                             active:
 *                               type: integer
 *                             completed:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                             delayed:
 *                               type: integer
 *                         remove:
 *                           type: object
 *                           properties:
 *                             waiting:
 *                               type: integer
 *                             active:
 *                               type: integer
 *                             completed:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                             delayed:
 *                               type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/queue', AdminSearchController.getQueueStats);

/**
 * @swagger
 * /api/admin/search/failed-jobs:
 *   get:
 *     summary: Get failed jobs
 *     description: Get list of failed indexing jobs
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: queue
 *         schema:
 *           type: string
 *           enum: [index, remove]
 *         description: Queue name to get failed jobs from
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of failed jobs to return
 *     responses:
 *       200:
 *         description: Failed jobs list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/failed-jobs', [
  query('queue').optional().isIn(['index', 'remove']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], AdminSearchController.getFailedJobs);

/**
 * @swagger
 * /api/admin/search/retry-jobs:
 *   post:
 *     summary: Retry failed jobs
 *     description: Retry failed indexing jobs
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queue:
 *                 type: string
 *                 enum: [index, remove]
 *                 description: Queue name
 *               jobIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific job IDs to retry (empty array retries all)
 *     responses:
 *       200:
 *         description: Jobs retry result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/retry-jobs', [
  body('queue').optional().isIn(['index', 'remove']),
  body('jobIds').optional().isArray(),
  body('jobIds.*').optional().isString()
], AdminSearchController.retryFailedJobs);

/**
 * @swagger
 * /api/admin/search/queue/{queueName}/completed:
 *   delete:
 *     summary: Clear completed jobs
 *     description: Clear completed jobs from a queue
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [index, remove]
 *         description: Queue name
 *     responses:
 *       200:
 *         description: Completed jobs cleared
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete('/queue/:queueName/completed', [
  param('queueName').isIn(['index', 'remove'])
], AdminSearchController.clearCompletedJobs);

/**
 * @swagger
 * /api/admin/search/queue/{queueName}/pause:
 *   post:
 *     summary: Pause queue processing
 *     description: Pause processing of jobs in a queue
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [index, remove]
 *         description: Queue name
 *     responses:
 *       200:
 *         description: Queue paused
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/queue/:queueName/pause', [
  param('queueName').isIn(['index', 'remove'])
], AdminSearchController.pauseQueue);

/**
 * @swagger
 * /api/admin/search/queue/{queueName}/resume:
 *   post:
 *     summary: Resume queue processing
 *     description: Resume processing of jobs in a queue
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [index, remove]
 *         description: Queue name
 *     responses:
 *       200:
 *         description: Queue resumed
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/queue/:queueName/resume', [
  param('queueName').isIn(['index', 'remove'])
], AdminSearchController.resumeQueue);

/**
 * @swagger
 * /api/admin/search/index:
 *   delete:
 *     summary: Clear search index
 *     description: Clear all documents from the search index
 *     tags: [Admin, Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search index cleared
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete('/index', AdminSearchController.clearIndex);

module.exports = router;
