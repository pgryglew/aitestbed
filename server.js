// Serwer bez zewnętrznych zależności – tylko wbudowane moduły Node.js.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const startedAt = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(data));
}

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      node: process.version,
      time: new Date().toISOString(),
    });
  }
  if (pathname === '/api/echo' && req.method === 'POST') {
    try {
      const { message } = JSON.parse(await readBody(req));
      if (typeof message !== 'string' || !message.trim()) {
        return sendJson(res, 400, { error: 'Pole "message" nie może być puste.' });
      }
      return sendJson(res, 200, { message: message.trim().slice(0, 500), receivedAt: new Date().toISOString() });
    } catch {
      return sendJson(res, 400, { error: 'Nieprawidłowe dane żądania.' });
    }
  }
  return sendJson(res, 404, { error: 'Nie znaleziono.' });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': MIME['.txt'] });
      return res.end('404 – nie ma takiej strony');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`aitestbed działa na http://localhost:${PORT}`));
}

module.exports = server;
