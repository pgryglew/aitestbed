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
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(data));
}

const MCP_TOOLS = [
  {
    name: 'get_voltrider_overview',
    description: 'Summarizes the VoltRider website and its motorcycle comparison guide.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_electric_offroad_motorcycles',
    description: 'Lists the electric off-road motorcycles compared on VoltRider, with their intended riding style.',
    inputSchema: {
      type: 'object',
      properties: { category: { type: 'string', enum: ['all', 'motocross', 'trail', 'enduro'], description: 'Optional riding category to filter by.' } },
      additionalProperties: false,
    },
  },
];

const MOTORCYCLES = [
  { name: 'Stark VARG MX 1.2', category: 'motocross', use: 'Pełnowymiarowy motocross do jazdy wyścigowej.' },
  { name: 'Sur-Ron Light Bee X', category: 'trail', use: 'Lekki, kompaktowy dirt bike na leśne trasy.' },
  { name: 'Talaria Sting R MX4', category: 'trail', use: 'Kompaktowy motocykl off-road do jazdy MX i trail.' },
  { name: 'KTM Freeride E', category: 'enduro', use: 'Elektryczne enduro do jazdy poza torem.' },
];

function handleMcp(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    // Browsers and endpoint checkers often open the advertised URL with GET.
    // MCP clients use POST for JSON-RPC; GET is reserved for optional SSE streams.
    if ((req.headers.accept || '').includes('text/event-stream')) {
      res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Server-initiated MCP event streams are not supported. Send JSON-RPC requests with POST.');
    }
    const info = {
      name: 'VoltRider site tools',
      transport: 'MCP Streamable HTTP',
      endpoint: 'https://aitestbed.pl/mcp',
      requestMethod: 'POST',
      tools: MCP_TOOLS.map(({ name, description }) => ({ name, description })),
      serverCard: 'https://aitestbed.pl/.well-known/mcp/server-card.json',
      documentation: 'https://aitestbed.pl/llms.txt',
    };
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'public, max-age=300' });
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(info, null, 2));
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    return res.end();
  }
  readBody(req, 32_000).then((raw) => {
    let message;
    try { message = JSON.parse(raw); }
    catch { return sendJson(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
    if (typeof message.method !== 'string') return sendJson(res, 400, { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32600, message: 'Invalid Request' } });
    if (message.method.startsWith('notifications/')) { res.writeHead(202); return res.end(); }

    let result;
    if (message.method === 'initialize') {
      result = {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'aitestbed/voltrider', title: 'VoltRider site tools', version: '1.0.0' },
        instructions: 'Read-only tools for the Polish VoltRider guide to electric off-road motorcycles.',
      };
    } else if (message.method === 'ping') result = {};
    else if (message.method === 'tools/list') result = { tools: MCP_TOOLS };
    else if (message.method === 'tools/call') {
      const { name, arguments: args = {} } = message.params || {};
      if (name === 'get_voltrider_overview') {
        result = { content: [{ type: 'text', text: 'VoltRider is an independent Polish-language guide comparing electric off-road motorcycles. It is not a manufacturer or dealer. Specs may vary by model year, market, and configuration. Main pages: https://aitestbed.pl/, https://aitestbed.pl/game.html, https://aitestbed.pl/about.html, https://aitestbed.pl/contact.html, https://aitestbed.pl/terms.html.' }] };
      } else if (name === 'list_electric_offroad_motorcycles') {
        const category = args.category || 'all';
        const filtered = MOTORCYCLES.filter(item => category === 'all' || item.category === category);
        result = { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
      } else {
        return sendJson(res, 200, { jsonrpc: '2.0', id: message.id, error: { code: -32602, message: 'Unknown tool' } });
      }
    } else {
      return sendJson(res, 200, { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } });
    }
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'MCP-Protocol-Version': '2025-06-18' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
  }).catch(() => {
    if (!res.headersSent) sendJson(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } });
  });
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

function serveStatic(req, res, pathname, extraHeaders = {}) {
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
      ...extraHeaders,
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (pathname === '/mcp') return handleMcp(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const wantsMarkdown = pathname === '/' && (req.headers.accept || '').includes('text/markdown');
  const servedPath = wantsMarkdown ? '/index.md' : pathname;
  const headers = pathname === '/' ? {
    Link: '<https://aitestbed.pl/index.md>; rel="alternate"; type="text/markdown", <https://aitestbed.pl/llms.txt>; rel="describedby"; type="text/plain"',
    Vary: 'Accept',
  } : {};
  serveStatic(req, res, servedPath, headers);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`aitestbed działa na http://localhost:${PORT}`));
}

module.exports = server;
