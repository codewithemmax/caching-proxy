#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

// --- Parse CLI args ---
const args = process.argv.slice(2);

// Handle --clear-cache flag (stateless here; in a real app you'd use a file/redis)
if (args.includes('--clear-cache')) {
  cache.clear();
  console.log('Cache cleared.');
  process.exit(0);
}

const portIndex = args.indexOf('--port');
const originIndex = args.indexOf('--origin');

if (portIndex === -1 || originIndex === -1) {
  console.error('Usage: caching-proxy --port <number> --origin <url>');
  console.error('       caching-proxy --clear-cache');
  process.exit(1);
}

const PORT = parseInt(args[portIndex + 1], 10);
const ORIGIN = args[originIndex + 1];

if (isNaN(PORT) || !ORIGIN) {
  console.error('Invalid --port or --origin value.');
  process.exit(1);
}

// --- Cache setup ---
const cache = new Map();
const TTL = 60_000; // 1 minute

// --- Proxy server ---
const server = http.createServer(async (req, res) => {
  const cacheKey = req.url; // e.g. "/products"
  const now = Date.now();

  // Check cache
  if (cache.has(cacheKey)) {
    const { body, headers, statusCode, timestamp } = cache.get(cacheKey);

    if (now - timestamp < TTL) {
      console.log(`[HIT]  ${req.url}`);
      res.writeHead(statusCode, { ...headers, 'X-Cache': 'HIT' });
      res.end(body);
      return;
    } else {
      console.log(`[EXPIRED] ${req.url}`);
      cache.delete(cacheKey);
    }
  }

  // Cache miss — forward to origin
  try {
    const targetUrl = new URL(req.url, ORIGIN);
    const body = await fetchFromOrigin(targetUrl.toString(), req);

    console.log(`[MISS] ${req.url}`);

    // Cache the result
    cache.set(cacheKey, {
      body: body.data,
      headers: body.headers,
      statusCode: body.statusCode,
      timestamp: now,
    });

    res.writeHead(body.statusCode, { ...body.headers, 'X-Cache': 'MISS' });
    res.end(body.data);
  } catch (err) {
    console.error(`Error proxying ${req.url}:`, err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  }
});

/**
 * Forward a request to the origin and return { statusCode, headers, data }.
 */
function fetchFromOrigin(url, incomingReq) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: incomingReq.method,
      headers: {
        ...incomingReq.headers,
        host: parsedUrl.hostname, // override host header
      },
    };

    const proxyReq = transport.request(options, (proxyRes) => {
      const chunks = [];

      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          data: Buffer.concat(chunks),
        });
      });
    });

    proxyReq.on('error', reject);
    incomingReq.pipe(proxyReq); // forward request body (for POST etc.)
  });
}

server.listen(PORT, () => {
  console.log(`Caching proxy running on http://localhost:${PORT}`);
  console.log(`Forwarding requests to: ${ORIGIN}`);
});