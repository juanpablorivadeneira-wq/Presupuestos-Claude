import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '../../data');
const FRONTEND_DIR = process.env.FRONTEND_DIR ?? path.join(__dirname, '../../dist');

const APP_USERNAME = process.env.APP_USERNAME ?? '';
const APP_PASSWORD = process.env.APP_PASSWORD ?? '';
const AUTH_SECRET = process.env.AUTH_SECRET ?? 'changeme-set-AUTH_SECRET-in-env';
const AUTH_ENABLED = Boolean(APP_USERNAME && APP_PASSWORD);

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// SQLite setup
const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id   INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT    NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// ── Token helpers ──────────────────────────────────────────────────────────────

function makeToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expected) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!AUTH_ENABLED) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!verifyToken(auth.slice(7))) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  next();
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({ token: 'no-auth', authEnabled: false });
  }
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (!username || !password || username !== APP_USERNAME || password !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  res.json({ token: makeToken(username), authEnabled: true });
});

// ── Data routes (protected) ───────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), authEnabled: AUTH_ENABLED });
});

app.get('/api/data', requireAuth, (_req, res) => {
  const row = db.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
  if (!row) return res.json(null);
  try {
    res.json(JSON.parse(row.data));
  } catch {
    res.status(500).json({ error: 'Corrupt state' });
  }
});

app.post('/api/data', requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const data = JSON.stringify(req.body);
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
  ).run(data, now);
  res.json({ ok: true });
});

app.get('/api/backup', requireAuth, (_req, res) => {
  const row = db.prepare('SELECT data, updated_at FROM app_state WHERE id = 1').get() as { data: string; updated_at: string } | undefined;
  if (!row) return res.status(404).json({ error: 'No data' });
  const date = row.updated_at.slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="buildkontrol-backup-${date}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(row.data);
});

// ── Serve frontend static files ──────────────────────────────────────────────

if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`BuildKontrol server running on http://0.0.0.0:${PORT}`);
  console.log(`Auth: ${AUTH_ENABLED ? `enabled (user: ${APP_USERNAME})` : 'disabled'}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Frontend: ${fs.existsSync(FRONTEND_DIR) ? FRONTEND_DIR : 'not found (dev mode)'}`);
});
