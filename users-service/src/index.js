const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET manquant');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student'
          CHECK (role IN ('student','librarian','admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
      if (ADMIN_EMAIL && ADMIN_PASSWORD) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await pool.query(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ('Admin', $1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
          [ADMIN_EMAIL, hash]
        );
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

const sign = (u) =>
  jwt.sign({ sub: u.id, name: u.name, role: u.role }, JWT_SECRET, { expiresIn: '8h' });

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'db unavailable' });
  }
});

app.post('/api/users/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ error: 'Nom, email et mot de passe (8 caractères min.) requis' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3)
       RETURNING id, name, email, role`,
      [name, email.toLowerCase(), hash]
    );
    res.status(201).json({ user: rows[0], token: sign(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash)))
      return res.status(401).json({ error: 'Identifiants incorrects' });
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token: sign(u) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/users/me', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

app.patch('/api/users/:id/role', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé' });
  const { role } = req.body || {};
  if (!['student', 'librarian', 'admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
  const { rows } = await pool.query(
    'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role', [role, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

let server;
initDb()
  .then(() => { server = app.listen(PORT, () => console.log(`users-service sur :${PORT}`)); })
  .catch((e) => { console.error(e); process.exit(1); });

const shutdown = () => {
  console.log('Arrêt propre (SIGTERM)');
  if (server) server.close(() => pool.end().then(() => process.exit(0)));
  else process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
