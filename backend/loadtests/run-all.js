#!/usr/bin/env node

/**
 * Master Load Test Runner
 *
 * Runs all load tests sequentially and generates a baseline report
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const tests = [
  {
    name: 'DRep Votes Endpoint (N+1 Query)',
    script: './test-drep-votes.js',
    critical: true
  },
  {
    name: 'Similarity Endpoint',
    script: './test-similarity.js',
    critical: true
  },
  {
    name: 'Clustering Endpoint (O(n²))',
    script: './test-clustering.js',
    critical: true
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔬 Running: ${test.name}`);
    console.log('='.repeat(80));

    const startTime = Date.now();
    const proc = exec(`node ${test.script}`, { cwd: __dirname }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;

      if (error) {
        console.error(`❌ Test failed: ${error.message}`);
        reject({ test, error, duration });
        return;
      }

      // Parse results from stdout
      const results = {
        testName: test.name,
        duration,
        rawOutput: stdout,
        critical: test.critical
      };

      // Extract metrics from output
      const requestsMatch = stdout.match(/Total requests: (\d+)/);
      const rpsMatch = stdout.match(/Requests\/sec: ([\d.]+)/);
      const p50Match = stdout.match(/Latency p50: ([\d.]+)ms/);
      const p95Match = stdout.match(/Latency p95: ([\d.]+)ms/);
      const p99Match = stdout.match(/Latency p99: ([\d.]+)ms/);
      const errorsMatch = stdout.match(/Errors: (\d+)/);

      if (requestsMatch) results.totalRequests = parseInt(requestsMatch[1]);
      if (rpsMatch) results.requestsPerSecond = parseFloat(rpsMatch[1]);
      if (p50Match) results.latencyP50 = parseFloat(p50Match[1]);
      if (p95Match) results.latencyP95 = parseFloat(p95Match[1]);
      if (p99Match) results.latencyP99 = parseFloat(p99Match[1]);
      if (errorsMatch) results.errors = parseInt(errorsMatch[1]);

      console.log('\n✅ Test completed');
      resolve(results);
    });

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  });
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 BASELINE PERFORMANCE TESTING');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Testing ${tests.length} endpoints\n`);

  const results = [];
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push(result);
      console.log(`\n⏱️  Elapsed: ${(result.duration / 1000).toFixed(1)}s\n`);

      // Small delay between tests to let system recover
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      failed++;
      console.error(`\n❌ Test failed after ${(error.duration / 1000).toFixed(1)}s\n`);
      results.push(error);
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('📋 BASELINE REPORT');
  console.log('='.repeat(80));
  console.log(`Completed at: ${new Date().toISOString()}\n`);

  console.log('## Performance Summary\n');
  console.log('| Endpoint | Req/s | p50 | p95 | p99 | Status |');
  console.log('|----------|-------|-----|-----|-----|--------|');

  results.forEach(result => {
    if (result.error) {
      console.log(`| ${result.test.name} | - | - | - | - | ❌ FAILED |`);
    } else {
      const status = result.critical && result.latencyP95 > 500 ? '⚠️ SLOW' : '✅ OK';
      console.log(`| ${result.testName} | ${result.requestsPerSecond?.toFixed(1) || 'N/A'} | ${result.latencyP50?.toFixed(1) || 'N/A'}ms | ${result.latencyP95?.toFixed(1) || 'N/A'}ms | ${result.latencyP99?.toFixed(1) || 'N/A'}ms | ${status} |`);
    }
  });

  console.log('\n## Identified Bottlenecks\n');
  console.log('1. **N+1 Query in DRep Votes Endpoint** (routes/dreps.js:83-95)');
  console.log('   - Executes 1 + N database queries');
  console.log('   - Fix: Use MongoDB $lookup or batch fetch\n');

  console.log('2. **O(n²) Clustering Algorithm** (services/clusteringService.js)');
  console.log('   - Loads ALL votes from database');
  console.log('   - Computes n²/2 similarity scores');
  console.log('   - Fix: Add pagination, caching, or approximate clustering\n');

  console.log('3. **No Response Compression**');
  console.log('   - Large JSON responses sent uncompressed');
  console.log('   - Fix: Enable gzip/brotli compression (already added!)\n');

  console.log('## Next Steps\n');
  console.log('1. Implement fixes for top 3 bottlenecks');
  console.log('2. Re-run this baseline test');
  console.log('3. Compare before/after metrics');
  console.log('4. Document improvements\n');

  // Save report to file
  const reportPath = path.join(__dirname, 'BASELINE_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalTests: tests.length,
      passed: results.length - failed,
      failed
    }
  }, null, 2));

  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
  console.log('='.repeat(80));
  console.log(`\n✅ Baseline testing complete! ${results.length - failed}/${tests.length} passed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
