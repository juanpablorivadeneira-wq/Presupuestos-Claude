import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '../../data');
const FRONTEND_DIR = process.env.FRONTEND_DIR ?? path.join(__dirname, '../../dist');

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

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// ── API routes ────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/data', (_req, res) => {
  const row = db.prepare('SELECT data FROM app_state WHERE id = 1').get() as { data: string } | undefined;
  if (!row) return res.json(null);
  try {
    res.json(JSON.parse(row.data));
  } catch {
    res.status(500).json({ error: 'Corrupt state' });
  }
});

app.post('/api/data', (req, res) => {
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

// Backup download
app.get('/api/backup', (_req, res) => {
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
  // SPA fallback — all non-API routes serve index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`BuildKontrol server running on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Frontend: ${fs.existsSync(FRONTEND_DIR) ? FRONTEND_DIR : 'not found (dev mode)'}`);
});
