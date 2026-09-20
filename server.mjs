// ponytail: satu-satunya alasan file ini ada — backend geasteats/smarttag tidak mengizinkan
// origin kiosk (tidak ada Access-Control-Allow-Origin → browser blokir). Proxy same-origin
// menghapus kebutuhan CORS. Aturan path sama persis dengan proxy dev di vite.config.ts.
// skipped: caching, retry, websocket. Tambah kalau ada trafik nyata yang butuh.
import express from 'express';
import path from 'node:path';

const COWORKING = process.env.API_COWORKING || 'https://geasteats.ngolab.online';
const NGOLAB = process.env.API_NGOLAB || 'https://smarttag.ngolab.online';
const PORT = Number(process.env.PORT) || 3001;

// Aturan sama persis dengan proxy dev di vite.config.ts
const resolve = (url) =>
  url.startsWith('/api/ngolab/') ? [NGOLAB, url.replace('/api/ngolab', '/api')]
    : url.startsWith('/api/coworking/') ? [COWORKING, url.replace('/api/coworking', '/api')]
      : [COWORKING, url]; // /api/* dan /uploads/* → coworking

const app = express();
app.use(express.static(path.resolve(process.cwd(), 'dist')));

// Proxy /api dan /uploads ke backend asli; semua header dari klien diteruskan apa adanya
// (x-api-key ikut), kecuali host/origin supaya allowlist backend tidak menolak.
app.use(async (req, res) => {
  const [base, upstreamPath] = resolve(req.originalUrl);
  const headers = { ...req.headers };
  headers.host = new URL(base).host;
  delete headers.origin;
  delete headers.referer;
  delete headers['accept-encoding'];
  delete headers['content-length'];

  try {
    const upstream = await fetch(base + upstreamPath, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
      duplex: 'half',
      redirect: 'manual',
    });
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `proxy gagal: ${err.message}` }));
  }
});

// SPA fallback untuk route react-router
app.get('*', (_req, res) => res.sendFile(path.resolve(process.cwd(), 'dist/index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`kiosk server on ${PORT}`));
process.on('uncaughtException', (e) => console.error('uncaught', e));
process.on('unhandledRejection', (e) => console.error('unhandled', e));
