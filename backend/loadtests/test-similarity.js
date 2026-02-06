#!/usr/bin/env node

/**
 * Load Test: GET /api/lobbying/similarity/:voterId
 *
 * Tests the similarity computation bottleneck where we fetch all votes
 * for a DRep and compare against all other DReps.
 *
 * Expected bottleneck: N queries for other DReps + O(n*m) comparisons
 */

const autocannon = require('autocannon');
const http = require('http');

// First, get a list of DRep IDs to test
async function getDRepIds() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/dreps?limit=10', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const drepIds = json.dreps.map(d => d.voterId).filter(Boolean);
          resolve(drepIds);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runLoadTest() {
  console.log('🔥 Load Test: GET /api/lobbying/similarity/:voterId\n');
  console.log('Fetching DRep IDs...');

  const drepIds = await getDRepIds();
  console.log(`Found ${drepIds.length} DReps\n`);

  if (drepIds.length === 0) {
    console.error('❌ No DReps found! Cannot run load test.');
    process.exit(1);
  }

  // Use the first DRep for testing
  const testDRepId = drepIds[0];
  console.log(`Testing with DRep: ${testDRepId}\n`);

  const instance = autocannon({
    url: `http://localhost:5000/api/lobbying/similarity/${testDRepId}?limit=10`,
    connections: 10, // 10 concurrent connections
    duration: 10, // 10 seconds
    pipelining: 1,
    title: 'Similarity Endpoint'
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
    console.log('   1. GovernanceVote.find() for target DRep');
    console.log('   2. GovernanceVote.find() for all other DReps');
    console.log('   3. O(n*m) similarity computation (n=votes, m=other DReps)');
    console.log('\n💡 Fixes:');
    console.log('   - Cache results (5min TTL already in place)');
    console.log('   - Add database indexes on (voter, proposalTxHash, proposalCertIndex)');
    console.log('   - Pre-compute similarity matrix\n');

    process.exit(0);
  });
}

runLoadTest().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
