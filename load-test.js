#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Parse command-line arguments
const args = process.argv.slice(2);
const config = {
  url: 'http://localhost:3000/api/courses',
  concurrency: 20,
  duration: 10, // seconds
  timeout: 5000, // ms
  help: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' || args[i] === '-u') {
    config.url = args[++i];
  } else if (args[i] === '--concurrency' || args[i] === '-c') {
    config.concurrency = parseInt(args[++i], 10);
  } else if (args[i] === '--duration' || args[i] === '-d') {
    config.duration = parseInt(args[++i], 10);
  } else if (args[i] === '--timeout' || args[i] === '-t') {
    config.timeout = parseInt(args[++i], 10);
  } else if (args[i] === '--help' || args[i] === '-h') {
    config.help = true;
  }
}

if (config.help) {
  console.log(`
🚀 Antigravity Load Testing Tool
================================

Usage: node load-test.js [options]

Options:
  -u, --url <url>          Target URL to test (default: http://localhost:3000/api/courses)
  -c, --concurrency <num>  Number of concurrent request workers (default: 20)
  -d, --duration <sec>     Test duration in seconds (default: 10)
  -t, --timeout <ms>       Request timeout in milliseconds (default: 5000)
  -h, --help               Display this help message
`);
  process.exit(0);
}

let parsedUrl;
try {
  parsedUrl = new URL(config.url);
} catch (err) {
  console.error(`\x1b[31mError: Invalid URL "${config.url}"\x1b[0m`);
  process.exit(1);
}

const httpModule = parsedUrl.protocol === 'https:' ? https : http;

let totalRequests = 0;
let completedRequests = 0;
let successRequests = 0;
let failedRequests = 0;
const responseTimes = [];
const statusCodes = {};
const errors = {};

let isRunning = true;
const startTime = Date.now();
const endTime = startTime + config.duration * 1000;

console.clear();
console.log(`\x1b[36m==================================================\x1b[0m`);
console.log(`\x1b[1m\x1b[35m🚀 Starting load test...\x1b[0m`);
console.log(`\x1b[36m==================================================\x1b[0m`);
console.log(`\x1b[33mTarget URL:\x1b[0m   ${config.url}`);
console.log(`\x1b[33mConcurrency:\x1b[0m  ${config.concurrency} concurrent workers`);
console.log(`\x1b[33mDuration:\x1b[0m     ${config.duration} seconds`);
console.log(`\x1b[33mTimeout:\x1b[0m      ${config.timeout} ms`);
console.log(`\x1b[36m--------------------------------------------------\x1b[0m\n`);

function makeRequest() {
  if (!isRunning || Date.now() >= endTime) {
    return;
  }

  const reqStart = Date.now();
  totalRequests++;

  const reqOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    timeout: config.timeout,
    headers: {
      'User-Agent': 'Antigravity-Load-Tester/1.0',
    }
  };

  const req = httpModule.request(reqOptions, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      const elapsed = Date.now() - reqStart;
      completedRequests++;
      responseTimes.push(elapsed);

      const code = res.statusCode;
      statusCodes[code] = (statusCodes[code] || 0) + 1;

      if (code >= 200 && code < 300) {
        successRequests++;
      } else {
        failedRequests++;
      }

      // Schedule the next request immediately
      setImmediate(makeRequest);
    });
  });

  req.on('error', (err) => {
    const elapsed = Date.now() - reqStart;
    completedRequests++;
    failedRequests++;
    
    const errMessage = err.code || err.message || 'Unknown Error';
    errors[errMessage] = (errors[errMessage] || 0) + 1;
    
    // Schedule the next request immediately
    setImmediate(makeRequest);
  });

  req.on('timeout', () => {
    req.destroy(new Error('Timeout'));
  });

  req.end();
}

// Start workers
for (let i = 0; i < config.concurrency; i++) {
  makeRequest();
}

// Progress reporting interval
const progressInterval = setInterval(() => {
  const now = Date.now();
  const elapsedSec = (now - startTime) / 1000;
  
  if (now >= endTime) {
    clearInterval(progressInterval);
    finishTest();
    return;
  }

  const rps = (completedRequests / elapsedSec).toFixed(1);
  const percent = Math.min(100, ((elapsedSec / config.duration) * 100)).toFixed(0);
  
  // ASCII Progress Bar
  const progressBarWidth = 20;
  const filledWidth = Math.round((elapsedSec / config.duration) * progressBarWidth);
  const bar = '█'.repeat(Math.max(0, Math.min(progressBarWidth, filledWidth))) + 
              '░'.repeat(Math.max(0, Math.min(progressBarWidth, progressBarWidth - filledWidth)));

  process.stdout.write(`\r\x1b[K\x1b[32m[${bar}] ${percent}%\x1b[0m | \x1b[33mElapsed:\x1b[0m ${elapsedSec.toFixed(1)}s | \x1b[34mRPS:\x1b[0m ${rps} | \x1b[32mOK:\x1b[0m ${successRequests} | \x1b[31mFail:\x1b[0m ${failedRequests}`);
}, 200);

function finishTest() {
  isRunning = false;
  const actualDuration = (Date.now() - startTime) / 1000;
  const finalRps = (completedRequests / actualDuration).toFixed(2);
  
  // Sort response times for percentiles
  responseTimes.sort((a, b) => a - b);
  const count = responseTimes.length;
  
  const min = count > 0 ? responseTimes[0] : 0;
  const max = count > 0 ? responseTimes[count - 1] : 0;
  const avg = count > 0 ? (responseTimes.reduce((sum, val) => sum + val, 0) / count).toFixed(2) : 0;
  
  const getPercentile = (p) => {
    if (count === 0) return 0;
    const index = Math.ceil((p / 100) * count) - 1;
    return responseTimes[index];
  };

  const p50 = getPercentile(50);
  const p90 = getPercentile(90);
  const p95 = getPercentile(95);
  const p99 = getPercentile(99);

  const successRate = completedRequests > 0 ? ((successRequests / completedRequests) * 100).toFixed(2) : '0.00';

  console.log('\n');
  console.log(`\x1b[36m==================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m📊 LOAD TEST RESULTS\x1b[0m`);
  console.log(`\x1b[36m==================================================\x1b[0m`);
  console.log(`\x1b[33mTotal Requests:\x1b[0m       ${completedRequests}`);
  console.log(`\x1b[33mSuccessful (2xx):\x1b[0m     \x1b[32m${successRequests}\x1b[0m`);
  console.log(`\x1b[33mFailed/Errors:\x1b[0m        \x1b[31m${failedRequests}\x1b[0m`);
  console.log(`\x1b[33mSuccess Rate:\x1b[0m         ${successRate}%`);
  console.log(`\x1b[33mThroughput:\x1b[0m           ${finalRps} req/sec`);
  console.log(`\x1b[33mActual Duration:\x1b[0m      ${actualDuration.toFixed(2)} seconds`);
  console.log(`\x1b[36m--------------------------------------------------\x1b[0m`);
  console.log(`\x1b[1mLatency Metrics:\x1b[0m`);
  console.log(`  Min:                ${min} ms`);
  console.log(`  Average:            ${avg} ms`);
  console.log(`  Max:                ${max} ms`);
  console.log(`  Median (p50):       ${p50} ms`);
  console.log(`  90th Percentile:    ${p90} ms`);
  console.log(`  95th Percentile:    ${p95} ms`);
  console.log(`  99th Percentile:    ${p99} ms`);
  console.log(`\x1b[36m--------------------------------------------------\x1b[0m`);
  
  console.log(`\x1b[1mHTTP Status Codes:\x1b[0m`);
  Object.keys(statusCodes).forEach(code => {
    console.log(`  ${code}: ${statusCodes[code]} requests`);
  });
  
  if (Object.keys(errors).length > 0) {
    console.log(`\x1b[36m--------------------------------------------------\x1b[0m`);
    console.log(`\x1b[1m\x1b[31mError Breakdown:\x1b[0m`);
    Object.keys(errors).forEach(err => {
      console.log(`  ${err}: ${errors[err]} occurrences`);
    });
  }
  console.log(`\x1b[36m==================================================\x1b[0m\n`);
}
