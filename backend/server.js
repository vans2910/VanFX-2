const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

loadEnv();

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@vanpips.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VanPipsAdmin2026';
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || '*';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const clients = new Set();

const initialDb = {
  users: [],
  signals: [
    {
      id: crypto.randomUUID(),
      pair: 'EUR/USD',
      direction: 'buy',
      title: 'Wait for pullback',
      entry: 'Confirm structure above 1.0860',
      stopLoss: 'Below session low',
      takeProfit: 'Scale at next resistance',
      risk: '1 percent max',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  videos: [],
  freeContent: null,
  subscriptionRequests: [],
  notifications: []
};

const server = http.createServer(async (req, res) => {
  try {
    setCors(res);
    if (req.method === 'OPTIONS') return send(res, 204);

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });

    const db = await readDb();

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { ok: true, name: 'Van Pips API', time: new Date().toISOString() });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJson(req);
      requireFields(body, ['name', 'email', 'phone', 'password']);
      const email = String(body.email).trim().toLowerCase();
      if (db.users.some((user) => user.email === email)) return send(res, 409, { error: 'Email already registered' });

      const user = {
        id: crypto.randomUUID(),
        name: clean(body.name),
        email,
        phone: clean(body.phone),
        passwordHash: hashPassword(body.password),
        role: email === ADMIN_EMAIL ? 'admin' : 'user',
        subscribed: false,
        subscriptionPlan: null,
        subscriptionStart: null,
        subscriptionEnd: null,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      await writeDb(db);
      return send(res, 201, authResponse(user));
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(req);
      requireFields(body, ['email', 'password']);
      const email = String(body.email).trim().toLowerCase();
      let user = db.users.find((item) => item.email === email);

      if (!user && email === ADMIN_EMAIL && String(body.password) === ADMIN_PASSWORD) {
        user = {
          id: crypto.randomUUID(),
          name: 'Van Pips Admin',
          email,
          phone: '',
          passwordHash: hashPassword(body.password),
          role: 'admin',
          subscribed: true,
          subscriptionPlan: 'Admin',
          subscriptionStart: new Date().toISOString(),
          subscriptionEnd: 'Lifetime',
          createdAt: new Date().toISOString()
        };
        db.users.push(user);
        await writeDb(db);
      }

      if (!user || !verifyPassword(body.password, user.passwordHash)) return send(res, 401, { error: 'Invalid email or password' });
      return send(res, 200, authResponse(user));
    }

    const auth = authenticate(req, db);

    if (req.method === 'GET' && url.pathname === '/api/me') {
      requireAuth(auth);
      return send(res, 200, publicUser(auth.user));
    }

    if (req.method === 'GET' && url.pathname === '/api/signals') {
      return send(res, 200, db.signals);
    }

    if (req.method === 'POST' && url.pathname === '/api/signals') {
      requireAdmin(auth);
      const body = await readJson(req);
      requireFields(body, ['pair', 'direction', 'title']);
      const signal = {
        id: crypto.randomUUID(),
        pair: clean(body.pair),
        direction: clean(body.direction),
        title: clean(body.title),
        entry: clean(body.entry || ''),
        stopLoss: clean(body.stopLoss || ''),
        takeProfit: clean(body.takeProfit || ''),
        risk: clean(body.risk || ''),
        status: clean(body.status || 'active'),
        createdAt: new Date().toISOString()
      };
      db.signals.unshift(signal);
      db.notifications.unshift(notification('New trading signal', signal.title, { signalId: signal.id }));
      await writeDb(db);
      broadcast('signal.created', signal);
      return send(res, 201, signal);
    }

    if (req.method === 'GET' && url.pathname === '/api/free-content') {
      return send(res, 200, db.freeContent || {});
    }

    if (req.method === 'POST' && url.pathname === '/api/free-content') {
      requireAdmin(auth);
      const body = await readJson(req);
      requireFields(body, ['title', 'body']);
      db.freeContent = {
        id: crypto.randomUUID(),
        title: clean(body.title),
        body: clean(body.body),
        updatedAt: new Date().toISOString()
      };
      db.notifications.unshift(notification('New market note', db.freeContent.title, { contentId: db.freeContent.id }));
      await writeDb(db);
      broadcast('content.updated', db.freeContent);
      return send(res, 200, db.freeContent);
    }

    if (req.method === 'GET' && url.pathname === '/api/videos') {
      return send(res, 200, db.videos);
    }

    if (req.method === 'POST' && url.pathname === '/api/videos') {
      requireAdmin(auth);
      const body = await readJson(req);
      requireFields(body, ['title', 'url']);
      const video = {
        id: crypto.randomUUID(),
        title: clean(body.title),
        description: clean(body.description || ''),
        url: clean(body.url),
        uploadedAt: new Date().toISOString()
      };
      db.videos.unshift(video);
      db.notifications.unshift(notification('New video lesson', video.title, { videoId: video.id }));
      await writeDb(db);
      broadcast('video.created', video);
      return send(res, 201, video);
    }

    if (req.method === 'GET' && url.pathname === '/api/notifications') {
      requireAuth(auth);
      return send(res, 200, db.notifications);
    }

    if (req.method === 'POST' && url.pathname === '/api/subscriptions/request') {
      requireAuth(auth);
      const body = await readJson(req);
      requireFields(body, ['plan']);
      const request = {
        id: crypto.randomUUID(),
        userId: auth.user.id,
        plan: clean(body.plan),
        paymentReference: clean(body.paymentReference || ''),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      db.subscriptionRequests.unshift(request);
      await writeDb(db);
      broadcast('subscription.requested', request);
      return send(res, 201, request);
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/users') {
      requireAdmin(auth);
      return send(res, 200, db.users.map(publicUser));
    }

    const subscriptionMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/subscription$/);
    if (req.method === 'PATCH' && subscriptionMatch) {
      requireAdmin(auth);
      const body = await readJson(req);
      const user = db.users.find((item) => item.id === subscriptionMatch[1]);
      if (!user) return send(res, 404, { error: 'User not found' });
      user.subscribed = Boolean(body.subscribed);
      user.subscriptionPlan = clean(body.plan || user.subscriptionPlan || '');
      user.subscriptionStart = body.start || new Date().toISOString();
      user.subscriptionEnd = body.end || user.subscriptionEnd || null;
      await writeDb(db);
      broadcast('subscription.updated', publicUser(user));
      return send(res, 200, publicUser(user));
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error.status || 500;
    return send(res, status, { error: status === 500 ? 'Server error' : error.message });
  }
});

server.on('upgrade', (req, socket) => {
  if (new URL(req.url, `http://${req.headers.host}`).pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    ''
  ].join('\r\n'));

  clients.add(socket);
  sendWs(socket, 'connected', { name: 'Van Pips live feed', time: new Date().toISOString() });
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
});

server.listen(PORT, HOST, () => {
  console.log(`Van Pips API listening on http://${HOST}:${PORT}`);
});

async function readDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch {
    await writeDb(initialDb);
    return JSON.parse(JSON.stringify(initialDb));
  }
}

async function writeDb(db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function loadEnv() {
  try {
    const env = require('node:fs').readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {}
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', PUBLIC_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function send(res, status, payload) {
  res.statusCode = status;
  if (status === 204) return res.end();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!body[field]) {
      const error = new Error(`Missing field: ${field}`);
      error.status = 400;
      throw error;
    }
  }
}

function clean(value) {
  return String(value ?? '').trim();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, saved) {
  const [salt, hash] = String(saved || '').split(':');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

function signToken(payload) {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  return payload.exp && payload.exp > Date.now() ? payload : null;
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function authenticate(req, db) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  const user = payload ? db.users.find((item) => item.id === payload.sub) : null;
  return { user };
}

function requireAuth(auth) {
  if (!auth.user) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
}

function requireAdmin(auth) {
  requireAuth(auth);
  if (auth.user.role !== 'admin') {
    const error = new Error('Admin access required');
    error.status = 403;
    throw error;
  }
}

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function authResponse(user) {
  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: publicUser(user)
  };
}

function notification(title, message, data = {}) {
  return {
    id: crypto.randomUUID(),
    title,
    message,
    data,
    read: false,
    createdAt: new Date().toISOString()
  };
}

function broadcast(type, payload) {
  for (const socket of clients) sendWs(socket, type, payload);
}

function sendWs(socket, type, payload) {
  if (socket.destroyed) return clients.delete(socket);
  socket.write(encodeWsFrame(JSON.stringify({ type, payload })));
}

function encodeWsFrame(message) {
  const payload = Buffer.from(message);
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}
