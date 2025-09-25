#!/usr/bin/env node

/**
 * Product Reindexing Script
 * 
 * This script performs a full reindex of all products in the search engine.
 * It can be run manually or scheduled as a nightly job.
 * 
 * Usage:
 *   node scripts/reindex-products.js [options]
 * 
 * Options:
 *   --dry-run          Show what would be indexed without actually indexing
 *   --batch-size=N     Number of products to process in each batch (default: 100)
 *   --clear-first      Clear the index before reindexing (default: true)
 *   --no-clear         Don't clear the index before reindexing
 *   --help             Show this help message
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const IndexerService = require('../src/services/IndexerService');
const { logger } = require('../src/middleware/errorHandler');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    batchSize: 100,
    clearFirst: true,
    help: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      options.help = true;
    } else if (arg === '--no-clear') {
      options.clearFirst = false;
    } else if (arg.startsWith('--batch-size=')) {
      const size = parseInt(arg.split('=')[1]);
      if (isNaN(size) || size < 1) {
        console.error('Error: batch-size must be a positive integer');
        process.exit(1);
      }
      options.batchSize = size;
    } else if (arg.startsWith('--clear-first=')) {
      options.clearFirst = arg.split('=')[1].toLowerCase() === 'true';
    } else {
      console.error(`Error: Unknown option ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Product Reindexing Script

This script performs a full reindex of all products in the search engine.

Usage:
  node scripts/reindex-products.js [options]

Options:
  --dry-run          Show what would be indexed without actually indexing
  --batch-size=N     Number of products to process in each batch (default: 100)
  --clear-first      Clear the index before reindexing (default: true)
  --no-clear         Don't clear the index before reindexing
  --help             Show this help message

Examples:
  node scripts/reindex-products.js
  node scripts/reindex-products.js --dry-run
  node scripts/reindex-products.js --batch-size=50 --no-clear
  node scripts/reindex-products.js --dry-run --batch-size=200

Environment Variables:
  SEARCH_ENGINE      Search engine to use (default: meilisearch)
  MEILISEARCH_HOST   Meilisearch host URL (default: http://localhost:7700)
  MEILISEARCH_API_KEY Meilisearch API key (required)
  MEILISEARCH_INDEX_PRODUCTS Index name (default: products)
  REDIS_HOST         Redis host for queue (default: localhost)
  REDIS_PORT         Redis port (default: 6379)
  REDIS_PASSWORD     Redis password (optional)
  REDIS_DB           Redis database (default: 0)
`);
}

// Progress callback for reindexing
function progressCallback(progress) {
  const { processed, total, indexed, errors, percentage } = progress;
  const barLength = 50;
  const filledLength = Math.round((barLength * percentage) / 100);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  
  process.stdout.write(`\rProgress: [${bar}] ${percentage}% (${processed}/${total}) | Indexed: ${indexed} | Errors: ${errors}`);
  
  if (processed === total) {
    process.stdout.write('\n');
  }
}

// Main execution function
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('GlobeMart Product Reindexing Script');
  console.log('=====================================\n');

  // Validate environment
  if (!process.env.MEILISEARCH_API_KEY) {
    console.error('Error: MEILISEARCH_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Search Engine: ${process.env.SEARCH_ENGINE || 'meilisearch'}`);
  console.log(`  Meilisearch Host: ${process.env.MEILISEARCH_HOST || 'http://localhost:7700'}`);
  console.log(`  Index Name: ${process.env.MEILISEARCH_INDEX_PRODUCTS || 'products'}`);
  console.log(`  Batch Size: ${options.batchSize}`);
  console.log(`  Clear First: ${options.clearFirst}`);
  console.log(`  Dry Run: ${options.dryRun}`);
  console.log('');

  try {
    // Check if reindexing is already in progress
    const status = await IndexerService.getIndexingStatus();
    if (status.isReindexing) {
      console.error('Error: Reindexing is already in progress');
      process.exit(1);
    }

    // Check search service health
    console.log('Checking search service health...');
    const isHealthy = await IndexerService.searchService.isHealthy();
    if (!isHealthy) {
      console.error('Error: Search service is not healthy');
      process.exit(1);
    }
    console.log('✓ Search service is healthy\n');

    // Get current counts
    console.log('Getting current index statistics...');
    const counts = await IndexerService.compareCounts();
    console.log(`  Database products: ${counts.database}`);
    console.log(`  Indexed products: ${counts.index}`);
    console.log(`  Difference: ${counts.difference}`);
    console.log(`  In sync: ${counts.inSync ? 'Yes' : 'No'}\n`);

    if (options.dryRun) {
      console.log('DRY RUN MODE - No changes will be made\n');
    }

    // Start reindexing
    console.log('Starting reindexing process...\n');
    const startTime = Date.now();
    
    const result = await IndexerService.reindexAll({
      batchSize: options.batchSize,
      dryRun: options.dryRun,
      clearFirst: options.clearFirst,
      progressCallback
    });

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\nReindexing completed!');
    console.log('====================');
    console.log(`  Total processed: ${result.processed}`);
    console.log(`  Successfully indexed: ${result.indexed}`);
    console.log(`  Errors: ${result.errors}`);
    console.log(`  Duration: ${duration} seconds`);
    console.log(`  Success rate: ${result.processed > 0 ? Math.round((result.indexed / result.processed) * 100) : 0}%`);

    if (result.errors > 0) {
      console.log('\n⚠️  Some products failed to index. Check the logs for details.');
    }

    // Get final counts
    console.log('\nFinal statistics:');
    const finalCounts = await IndexerService.compareCounts();
    console.log(`  Database products: ${finalCounts.database}`);
    console.log(`  Indexed products: ${finalCounts.index}`);
    console.log(`  Difference: ${finalCounts.difference}`);
    console.log(`  In sync: ${finalCounts.inSync ? 'Yes' : 'No'}`);

    if (result.success) {
      console.log('\n✅ Reindexing completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Reindexing completed with errors');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Reindexing failed:', error.message);
    logger.error('Reindexing script failed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT. Shutting down gracefully...');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM. Shutting down gracefully...');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, showHelp };
