// ponytail: satu-satunya alasan file ini ada — backend geasteats/smarttag tidak mengizinkan
// origin kiosk (tidak ada Access-Control-Allow-Origin → diblok browser). Proxy same-origin
// menghapus kebutuhan CORS sepenuhnya. Port langsung dari proxy di vite.config.ts.
// skipped: caching, retry, websocket. Tambah kalau ada trafik nyata yang butuh.
import http from 'node:http';

const COWORKING = process.env.API_COWORKING || 'https://geasteats.ngolab.online';
const NGOLAB = process.env.API_NGOLAB || 'https://smarttag.ngolab.online';
const PORT = Number(process.env.PORT) || 3001;

// Aturan sama persis dengan proxy dev di vite.config.ts
const resolve = (url) =>
  url.startsWith('/api/ngolab/') ? [NGOLAB, url.replace('/api/ngolab', '/api')]
    : url.startsWith('/api/coworking/') ? [COWORKING, url.replace('/api/coworking', '/api')]
      : [COWORKING, url]; // /api/* dan /uploads/* → coworking

const read = (req) =>
  new Promise((ok, no) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });

http
  .createServer(async (req, res) => {
    const [base, path] = resolve(req.url);
    const headers = { ...req.headers };
    // host wajib milik target (nginx vhost), origin dibuang supaya allowlist backend tidak menolak
    headers.host = new URL(base).host;
    delete headers.origin;
    delete headers.referer;
    delete headers['accept-encoding'];
    delete headers['content-length'];

    try {
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await read(req);
      const upstream = await fetch(base + path, {
        method: req.method,
        headers,
        body,
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
  })
  .listen(PORT, () => console.log(`kiosk api proxy listening on ${PORT}`));
