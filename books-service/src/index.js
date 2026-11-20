const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET manquant');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED = [
  ['Clean Code', 'Robert C. Martin', 'Informatique', 3],
  ['Design Patterns', 'Gamma et al.', 'Informatique', 2],
  ['Kubernetes in Action', 'Marko Lukša', 'DevOps', 2],
  ['The Phoenix Project', 'Gene Kim', 'DevOps', 4],
  ['Le Petit Prince', 'Antoine de Saint-Exupéry', 'Littérature', 5],
  ['Les Misérables', 'Victor Hugo', 'Littérature', 2],
];

async function initDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT,
        stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0)
      )`);
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM books');
      if (rows[0].n === 0 && process.env.SEED !== 'false') {
        for (const b of SEED)
          await pool.query('INSERT INTO books (title, author, category, stock) VALUES ($1,$2,$3,$4)', b);
      }
      console.log('Base PostgreSQL prête');
      return;
    } catch (err) {
      console.log(`Base indisponible (${i}/30) : ${err.message}`);
      await sleep(2000);
    }
  }
  throw new Error('Impossible de joindre PostgreSQL');
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Accès refusé' });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'db unavailable' });
  }
});

app.get('/api/books', auth, async (req, res) => {
  const q = (req.query.search || '').trim();
  const { rows } = q
    ? await pool.query(
        `SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 OR category ILIKE $1 ORDER BY title`,
        [`%${q}%`])
    : await pool.query('SELECT * FROM books ORDER BY title');
  res.json(rows);
});

app.get('/api/books/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Livre introuvable' });
  res.json(rows[0]);
});

app.post('/api/books', auth, requireRole('librarian', 'admin'), async (req, res) => {
  const { title, author, category, stock } = req.body || {};
  if (!title || !author) return res.status(400).json({ error: 'Titre et auteur requis' });
  const { rows } = await pool.query(
    'INSERT INTO books (title, author, category, stock) VALUES ($1,$2,$3,$4) RETURNING *',
    [title, author, category || null, Number.isInteger(stock) && stock >= 0 ? stock : 1]);
  res.status(201).json(rows[0]);
});

// Appelé par loans-service : modification atomique du stock (-1 emprunt, +1 retour)
app.patch('/api/books/:id/stock', auth, async (req, res) => {
  const delta = Number(req.body?.delta);
  if (![-1, 1].includes(delta)) return res.status(400).json({ error: 'delta doit valoir -1 ou 1' });
  const { rows } = await pool.query(
    'UPDATE books SET stock = stock + $1 WHERE id = $2 AND stock + $1 >= 0 RETURNING *',
    [delta, req.params.id]);
  if (!rows[0]) {
    const exists = await pool.query('SELECT 1 FROM books WHERE id=$1', [req.params.id]);
    return exists.rowCount
      ? res.status(409).json({ error: 'Stock insuffisant' })
      : res.status(404).json({ error: 'Livre introuvable' });
  }
  res.json(rows[0]);
});

let server;
initDb()
  .then(() => { server = app.listen(PORT, () => console.log(`books-service sur :${PORT}`)); })
  .catch((e) => { console.error(e); process.exit(1); });

const shutdown = () => {
  if (server) server.close(() => pool.end().then(() => process.exit(0)));
  else process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
