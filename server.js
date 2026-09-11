/**
 * The Scriber Experience - OBS Widget Local Server & Live Webhook Bridge
 * Serves static files and provides Server-Sent Events (SSE) / REST API for live alerts.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { PLATFORMS, DONATION_TARGETS, TSE_LINKS } = require('./public/js/widget');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Active SSE Clients (for live stream alerts)
const sseClients = new Set();

function broadcastEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (err) {
      sseClients.delete(res);
    }
  }
}

function handleStaticFile(req, res, pathname) {
  let cleanPath = pathname.split('?')[0].replace(/^[\/\\]+/, '');
  if (!cleanPath || cleanPath === 'index.html') cleanPath = path.join('html', 'index.html');

  let filePath = path.resolve(PUBLIC_DIR, cleanPath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(path.join(PUBLIC_DIR, 'html', cleanPath))) {
      filePath = path.join(PUBLIC_DIR, 'html', cleanPath);
    } else if (fs.existsSync(path.join(PUBLIC_DIR, 'css', cleanPath))) {
      filePath = path.join(PUBLIC_DIR, 'css', cleanPath);
    } else if (fs.existsSync(path.join(PUBLIC_DIR, 'js', cleanPath))) {
      filePath = path.join(PUBLIC_DIR, 'js', cleanPath);
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      } else if (fs.existsSync(path.join(filePath, 'html', 'index.html'))) {
        filePath = path.join(filePath, 'html', 'index.html');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. SSE Stream for Live OBS Alerts
  if (pathname === '/events' || pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. Trigger Cheer Alert via POST/GET
  if (pathname === '/api/cheer' || pathname === '/api/donate') {
    let donor = parsedUrl.searchParams.get('donor') || 'Scriber Champion';
    let amount = parsedUrl.searchParams.get('amount') || '$10.00';
    let message = parsedUrl.searchParams.get('message') || 'Keep creating awesome content! ✨';
    let target = parsedUrl.searchParams.get('target') || 'cashapp';

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          if (body) {
            const data = JSON.parse(body);
            donor = data.donor || donor;
            amount = data.amount || amount;
            message = data.message || message;
            target = data.target || target;
          }
        } catch (e) {
          // ignore parse error, fallback to query params
        }
        const alertData = { donor, amount, message, target, timestamp: Date.now() };
        broadcastEvent('cheer', alertData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, alert: alertData }));
      });
      return;
    } else {
      const alertData = { donor, amount, message, target, timestamp: Date.now() };
      broadcastEvent('cheer', alertData);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, alert: alertData }));
      return;
    }
  }

  // 3. Status API
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      app: 'The Scriber Experience OBS Widget',
      version: '1.0.0',
      connectedClients: sseClients.size,
      time: new Date().toISOString()
    }));
    return;
  }

  // 4. Default: Static File Server
  handleStaticFile(req, res, pathname);
});

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`✨ The Scriber Experience OBS Donate Widget running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer, broadcastEvent, sseClients, PLATFORMS, DONATION_TARGETS, TSE_LINKS };
