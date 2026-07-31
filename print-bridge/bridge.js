#!/usr/bin/env node
/**
 * Receipt Booth — Local WiFi Print Bridge
 * ----------------------------------------
 * Run this on your Mac. It does two things:
 *   1. Serves the built kiosk app over HTTP on your local network
 *      so the iPad can access it at http://<your-mac-ip>:3001
 *   2. Accepts POST /print?ip=<printer-ip> and forwards the raw
 *      ESC/POS bytes to the printer over TCP port 9100
 *
 * SETUP:  see README.md
 * START:  node bridge.js
 */

// ── CONFIG ───────────────────────────────────────────────────────────────────
const PRINTER_PORT  = 9100;   // ESC/POS — don't change
const BRIDGE_PORT   = 3001;   // port this bridge (and the app) listens on
// Optional shared secret. Set to a non-empty string and add the same value
// as "Bridge Secret" in the app's Settings to require authorisation for
// every print job. Leave empty to allow unauthenticated LAN access.
const SECRET        = '';
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const net  = require('net');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { URL } = require('url');

// ── Static file serving ───────────────────────────────────────────────────────
const STATIC_DIR = path.resolve(__dirname, '..', 'artifacts', 'receipt-booth', 'dist', 'public');
const hasStatic  = fs.existsSync(STATIC_DIR);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
};

function serveStatic(reqPath, res) {
  // Normalise path and prevent traversal
  let rel = decodeURIComponent(reqPath).replace(/\?.*$/, '');
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.join(STATIC_DIR, rel);
  if (!abs.startsWith(STATIC_DIR + path.sep) && abs !== STATIC_DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // SPA: fall back to index.html for unknown routes
  const target = (fs.existsSync(abs) && !fs.statSync(abs).isDirectory()) ? abs : path.join(STATIC_DIR, 'index.html');
  const mime   = MIME[path.extname(target)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
  fs.createReadStream(target).pipe(res);
}

// ── Local IP detection ────────────────────────────────────────────────────────
function getLocalIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Parse URL — base is arbitrary since we only care about pathname + query
  const parsed   = new URL(req.url, `http://localhost:${BRIDGE_PORT}`);
  const pathname = parsed.pathname;

  // ── Print job: POST /print?ip=<printer-ip> ──────────────────────────────
  if (req.method === 'POST' && pathname === '/print') {
    // Optional shared-secret check
    if (SECRET) {
      const token = req.headers['x-bridge-token'] || '';
      if (token !== SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
        return;
      }
    }

    const printerIp = parsed.searchParams.get('ip');
    if (!printerIp) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing ?ip= query parameter' }));
      return;
    }

    // Validate that the supplied value looks like an IPv4 address
    const ipParts = printerIp.split('.');
    const validIp = ipParts.length === 4 && ipParts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
    if (!validIp) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: `Invalid printer IP: "${printerIp}"` }));
      return;
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const payload = Buffer.concat(chunks);
      console.log(`[bridge] ${payload.length} bytes → ${printerIp}:${PRINTER_PORT}`);

      const socket   = new net.Socket();
      let   finished = false;

      const finish = (err) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        if (err) {
          console.error('[bridge] ✗', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        } else {
          console.log('[bridge] ✓ Print job sent');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }
      };

      socket.setTimeout(10000);
      socket.on('error',   finish);
      socket.on('timeout', () => finish(new Error('TCP connection timed out')));
      socket.connect(PRINTER_PORT, printerIp, () => {
        socket.write(payload, err => {
          if (err) return finish(err);
          setTimeout(() => finish(null), 200);
        });
      });
    });
    return;
  }

  // ── Status / health check: GET /status ──────────────────────────────────
  if (req.method === 'GET' && pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port: BRIDGE_PORT }));
    return;
  }

  // ── Static kiosk app ─────────────────────────────────────────────────────
  if (hasStatic && req.method === 'GET') {
    serveStatic(pathname, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end(hasStatic ? 'Not found' : 'App not built — see README.md');
});

server.listen(BRIDGE_PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('');
  console.log('  ┌────────────────────────────────────────────────────────┐');
  console.log('  │        Receipt Booth — WiFi Print Bridge               │');
  console.log('  ├────────────────────────────────────────────────────────┤');
  console.log(`  │  Open on iPad →  http://${localIp}:${BRIDGE_PORT}              │`);
  console.log(`  │  App files    →  ${hasStatic ? '✓ built app is ready' : '✗ not built yet (see README)'}      │`);
  console.log('  └────────────────────────────────────────────────────────┘');
  console.log('');
  if (!hasStatic) {
    console.log('  ⚠  Build the app first (from the project root):');
    console.log('     PORT=3001 BASE_PATH=/ pnpm --filter @workspace/receipt-booth build');
    console.log('');
  }
  console.log('  Printer IP is set per print job from the app Settings.');
  console.log('  Waiting for print jobs… (Ctrl+C to stop)');
  console.log('');
});
