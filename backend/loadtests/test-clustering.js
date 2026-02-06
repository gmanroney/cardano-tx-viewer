#!/usr/bin/env node

/**
 * Load Test: POST /api/lobbying/compute-blocs
 *
 * Tests the O(n²) clustering bottleneck where similarity matrix
 * computation scales quadratically with number of DReps.
 *
 * Expected bottleneck: n²/2 similarity computations + full table scan
 */

const autocannon = require('autocannon');

async function runLoadTest() {
  console.log('🔥 Load Test: POST /api/lobbying/compute-blocs\n');
  console.log('⚠️  WARNING: This endpoint is VERY expensive!');
  console.log('   - Loads ALL votes from database');
  console.log('   - Computes O(n²) similarity matrix');
  console.log('   - For n=500 DReps: 125,000 operations\n');
  console.log('Running with LOW concurrency to avoid overload...\n');

  const instance = autocannon({
    url: 'http://localhost:5000/api/lobbying/compute-blocs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ threshold: 0.7 }),
    connections: 2, // LOW concurrency (this endpoint is heavy!)
    duration: 20, // 20 seconds
    pipelining: 1,
    title: 'Clustering Endpoint (O(n²) Bottleneck)'
  }, (err, result) => {
    if (err) {
      console.error('❌ Load test failed:', err);
      process.exit(1);
    }
  });

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: true,
    renderLatencyTable: true
  });

  instance.on('done', (results) => {
    console.log('\n📊 Results Summary:');
    console.log('==================');
    console.log(`Total requests: ${results.requests.total}`);
    console.log(`Requests/sec: ${results.requests.average.toFixed(2)}`);
    console.log(`Latency p50: ${results.latency.p50.toFixed(2)}ms`);
    console.log(`Latency p95: ${results.latency.p95.toFixed(2)}ms`);
    console.log(`Latency p99: ${results.latency.p99.toFixed(2)}ms`);
    console.log(`Throughput: ${(results.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
    console.log(`Errors: ${results.errors}`);
    console.log('\n⚠️  Expected bottlenecks:');
    console.log('   1. GovernanceVote.find({}).lean() - loads ALL votes');
    console.log('   2. O(n²) similarity matrix computation');
    console.log('   3. No pagination or incremental computation');
    console.log('\n💡 Fixes:');
    console.log('   - Add pagination/batching');
    console.log('   - Cache similarity matrix (Redis)');
    console.log('   - Use approximate clustering (k-means, DBSCAN)');
    console.log('   - Compute incrementally (only new DReps)\n');

    process.exit(0);
  });
}

runLoadTest().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
