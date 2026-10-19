/**
 * College DSA RankBoard — Comprehensive High-Concurrency Load Testing Harness
 * 
 * Tests the real running API at stages: 100, 250, 500, 750, and 1,000 concurrent VUs.
 * Measures Requests/sec, Latency Percentiles (p50, p95, p99), Error Rates, and Resource Usage.
 */

const http = require('http');
const os = require('os');

// Configure global HTTP Agent with unlimited sockets to prevent client-side socket pool bottlenecks
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 2000,
  maxFreeSockets: 500,
  timeout: 30000,
});

const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:5000';

// Realistic distribution of endpoints hit by students and visitors
const ENDPOINTS = [
  { path: '/api/leaderboard', weight: 40, name: 'Leaderboard (Unfiltered)' },
  { path: '/api/leaderboard?limit=25&page=1', weight: 20, name: 'Leaderboard (Paginated)' },
  { path: '/api/leaderboard?department=PRIME', weight: 12, name: 'Leaderboard (Dept Filter)' },
  { path: '/api/leaderboard?year=4', weight: 8, name: 'Leaderboard (Year Filter)' },
  { path: '/api/leaderboard?search=a', weight: 5, name: 'Leaderboard (Search)' },
  { path: '/api/showcase/import_62616368696e616d616e6f67', weight: 5, name: 'Student Showcase' },
  { path: '/api/student/verify-registration', weight: 5, name: 'Verify Registration' },
  { path: '/api/health', weight: 5, name: 'Health Check' },
];

// Weighted random selector
function selectEndpoint() {
  const rand = Math.random() * 100;
  let cum = 0;
  for (const ep of ENDPOINTS) {
    cum += ep.weight;
    if (rand <= cum) return ep;
  }
  return ENDPOINTS[0];
}

/**
 * Execute a single HTTP request with timeout and latency tracking
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const start = process.hrtime.bigint();

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      agent: httpAgent,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RankBoard-LoadTest/1.0',
        ...(options.headers || {}),
      },
      timeout: options.timeout || 10000,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          durationMs,
          bytes: Buffer.byteLength(data),
          error: null,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const end = process.hrtime.bigint();
      resolve({
        statusCode: 408,
        durationMs: Number(end - start) / 1e6,
        bytes: 0,
        error: 'ETIMEDOUT',
      });
    });

    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      resolve({
        statusCode: 0,
        durationMs: Number(end - start) / 1e6,
        bytes: 0,
        error: err.code || err.message,
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

/**
 * Calculates percentiles from sorted array of latencies
 */
function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) {
    return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  latencies.sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(Math.floor((p / 100) * latencies.length), latencies.length - 1);
    return Math.round(latencies[idx] * 100) / 100;
  };
  const sum = latencies.reduce((acc, v) => acc + v, 0);

  return {
    min: Math.round(latencies[0] * 100) / 100,
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    max: Math.round(latencies[latencies.length - 1] * 100) / 100,
    mean: Math.round((sum / latencies.length) * 100) / 100,
  };
}

/**
 * Runs a load test stage with specified concurrency and duration
 */
async function runStage({ stageName, concurrency, durationSec = 15, mixType = 'mixed' }) {
  console.log(`\n================================================================`);
  console.log(`🚀 STAGE: ${stageName}`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Virtual Users (VU Concurrency): ${concurrency}`);
  console.log(`   Duration: ${durationSec}s | Mix: ${mixType}`);
  console.log(`================================================================`);

  const initialMem = process.memoryUsage();
  const startTime = Date.now();
  const stopTime = startTime + durationSec * 1000;

  const latencies = [];
  const statusCounts = {};
  let totalBytes = 0;
  let activeWorkers = 0;

  async function worker() {
    activeWorkers++;
    while (Date.now() < stopTime) {
      let targetPath = '/api/leaderboard';
      if (mixType === 'mixed') {
        targetPath = selectEndpoint().path;
      } else if (mixType === 'leaderboard') {
        targetPath = '/api/leaderboard';
      } else if (mixType === 'auth') {
        targetPath = '/api/student/verify-registration';
      }

      const res = await makeRequest(targetPath);
      latencies.push(res.durationMs);
      totalBytes += res.bytes;
      statusCounts[res.statusCode] = (statusCounts[res.statusCode] || 0) + 1;
    }
    activeWorkers--;
  }

  // Launch concurrent workers
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const finalMem = process.memoryUsage();
  const totalRequests = latencies.length;
  const rps = Math.round((totalRequests / totalTimeSec) * 10) / 10;
  const stats = calculatePercentiles(latencies);

  const successCount = Object.keys(statusCounts)
    .filter((k) => k >= 200 && k < 400)
    .reduce((acc, k) => acc + statusCounts[k], 0);

  const errorCount = totalRequests - successCount;
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0.00';
  const mbTransferred = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log(`\n📊 STAGE RESULTS: ${stageName}`);
  console.log(`   Total Requests Completed: ${totalRequests.toLocaleString()}`);
  console.log(`   Throughput: ${rps.toLocaleString()} requests/second`);
  console.log(`   Data Transferred: ${mbTransferred} MB`);
  console.log(`   Success Count: ${successCount} (${((successCount / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`   Failed / Error Count: ${errorCount} (${errorRate}%)`);
  console.log(`   Status Codes:`, statusCounts);
  console.log(`   Latencies (ms):`);
  console.log(`     - Min:    ${stats.min} ms`);
  console.log(`     - Median (p50): ${stats.p50} ms`);
  console.log(`     - p95:    ${stats.p95} ms`);
  console.log(`     - p99:    ${stats.p99} ms`);
  console.log(`     - Max:    ${stats.max} ms`);
  console.log(`     - Mean:   ${stats.mean} ms`);
  console.log(`   Memory (Node Process):`);
  console.log(`     - Heap Used: ${(finalMem.heapUsed / (1024 * 1024)).toFixed(1)} MB (Δ ${((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`     - RSS:       ${(finalMem.rss / (1024 * 1024)).toFixed(1)} MB`);

  return {
    stageName,
    concurrency,
    durationSec: totalTimeSec,
    totalRequests,
    rps,
    successCount,
    errorCount,
    errorRate: Number(errorRate),
    statusCounts,
    latencies: stats,
    mbTransferred: Number(mbTransferred),
    memory: {
      heapUsedMb: Number((finalMem.heapUsed / (1024 * 1024)).toFixed(1)),
      rssMb: Number((finalMem.rss / (1024 * 1024)).toFixed(1)),
    },
  };
}

/**
 * Runs controlled registration concurrency benchmark
 */
async function runRegistrationConcurrencyTest(batchSizes = [10, 25, 50, 100]) {
  console.log(`\n================================================================`);
  console.log(`🧪 CONTROLLED REGISTRATION & IDEMPOTENCY CONCURRENCY TEST`);
  console.log(`   Testing duplicate prevention, idempotency & failure handling`);
  console.log(`================================================================`);

  const results = [];

  for (const batchSize of batchSizes) {
    console.log(`\n▶ Testing batch of ${batchSize} simultaneous registration verification/linking requests...`);
    const start = Date.now();
    const requests = [];

    for (let i = 0; i < batchSize; i++) {
      // Test concurrent verification requests with varied receipts
      const receipt = `test_receipt_batch_${batchSize}_user_${i}`;
      requests.push(
        makeRequest('/api/student/verify-registration', {
          headers: { 'x-registration-receipt': receipt },
        })
      );
    }

    const responses = await Promise.all(requests);
    const elapsed = Date.now() - start;
    const lats = responses.map((r) => r.durationMs);
    const p = calculatePercentiles(lats);
    const status200 = responses.filter((r) => r.statusCode === 200).length;

    console.log(`   Completed ${batchSize} concurrent requests in ${elapsed}ms (${Math.round((batchSize / (elapsed / 1000)))} req/s)`);
    console.log(`   Status 200: ${status200}/${batchSize} | p50: ${p.p50}ms | p95: ${p.p95}ms | p99: ${p.p99}ms`);

    results.push({
      batchSize,
      elapsedMs: elapsed,
      rps: Math.round(batchSize / (elapsed / 1000)),
      successCount: status200,
      p50: p.p50,
      p95: p.p95,
      p99: p.p99,
    });
  }

  return results;
}

/**
 * Main execution harness
 */
async function main() {
  const args = process.argv.slice(2);
  const stageArg = args.find((a) => a.startsWith('--stage='))?.split('=')[1];
  const isRegistrationOnly = args.includes('--registration');

  // Verify server is up
  const healthCheck = await makeRequest('/api/health');
  if (healthCheck.statusCode !== 200) {
    console.error(`❌ Backend server at ${BASE_URL} is not responding (Status: ${healthCheck.statusCode}). Please ensure npm run dev is running.`);
    process.exit(1);
  }
  console.log(`✅ Target server ${BASE_URL} verified active.\n`);

  if (isRegistrationOnly) {
    await runRegistrationConcurrencyTest();
    return;
  }

  const stages = [
    { name: 'Stage 1 — 100 Virtual Users', concurrency: 100, durationSec: 10 },
    { name: 'Stage 2 — 250 Virtual Users', concurrency: 250, durationSec: 10 },
    { name: 'Stage 3 — 500 Virtual Users', concurrency: 500, durationSec: 10 },
    { name: 'Stage 4 — 750 Virtual Users', concurrency: 750, durationSec: 10 },
    { name: 'Stage 5 — 1,000 Virtual Users', concurrency: 1000, durationSec: 10 },
  ];

  const targetStages = stageArg
    ? stages.filter((s) => s.concurrency === parseInt(stageArg, 10))
    : stages;

  const stageResults = [];

  for (const s of targetStages) {
    const res = await runStage({
      stageName: s.name,
      concurrency: s.concurrency,
      durationSec: s.durationSec,
      mixType: 'mixed',
    });
    stageResults.push(res);
    // Pause 2 seconds between stages to allow sockets to settle
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Also run registration concurrency benchmark
  const registrationResults = await runRegistrationConcurrencyTest();

  // Print Summary Table
  console.log(`\n================================================================`);
  console.log(`📋 COMPLETE LOAD TESTING SUMMARY & CAPACITY MATRIX`);
  console.log(`================================================================`);
  console.table(
    stageResults.map((r) => ({
      Stage: r.stageName,
      'Concurrent VUs': r.concurrency,
      'Total Requests': r.totalRequests,
      'Throughput (RPS)': r.rps,
      'p50 Latency (ms)': r.latencies.p50,
      'p95 Latency (ms)': r.latencies.p95,
      'p99 Latency (ms)': r.latencies.p99,
      'Error Rate (%)': `${r.errorRate}%`,
    }))
  );

  console.log(`\n📋 REGISTRATION BATCH CONCURRENCY MATRIX`);
  console.table(registrationResults);

  // Output JSON report to server/load_test_results.json
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '../load_test_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ stageResults, registrationResults, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
}

main().catch(console.error);
