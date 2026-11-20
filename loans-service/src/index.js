const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URL = process.env.MONGO_URL;
const BOOKS_URL = process.env.BOOKS_URL || 'http://books-service:3002';
const LOAN_DAYS = Number(process.env.LOAN_DAYS || 14);
if (!JWT_SECRET || !MONGO_URL) {
  console.error('JWT_SECRET et MONGO_URL sont requis');
  process.exit(1);
}

const Loan = mongoose.model('Loan', new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  userName: String,
  bookId: { type: Number, required: true },
  bookTitle: String,
  borrowedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: Date,
}));

const app = express();
app.use(express.json());

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    req.token = h.slice(7);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}
const isStaff = (u) => ['librarian', 'admin'].includes(u.role);

const callBooks = (path, token, options = {}) =>
  fetch(`${BOOKS_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/ready', (_req, res) =>
  mongoose.connection.readyState === 1
    ? res.json({ status: 'ready' })
    : res.status(503).json({ status: 'db unavailable' }));

app.post('/api/loans', auth, async (req, res) => {
  const bookId = Number(req.body?.bookId);
  if (!bookId) return res.status(400).json({ error: 'bookId requis' });
  try {
    const bookRes = await callBooks(`/api/books/${bookId}`, req.token);
    if (bookRes.status === 404) return res.status(404).json({ error: 'Livre introuvable' });
    const book = await bookRes.json();

    const stockRes = await callBooks(`/api/books/${bookId}/stock`, req.token, {
      method: 'PATCH', body: JSON.stringify({ delta: -1 }) });
    if (stockRes.status === 409) return res.status(409).json({ error: 'Livre indisponible' });
    if (!stockRes.ok) return res.status(502).json({ error: 'Mise à jour du stock refusée' });

    const due = new Date(Date.now() + LOAN_DAYS * 86400000);
    try {
      const loan = await Loan.create({
        userId: req.user.sub, userName: req.user.name, bookId, bookTitle: book.title, dueDate: due });
      res.status(201).json(loan);
    } catch (e) {
      // Compensation : on remet le livre en stock si l'enregistrement échoue
      await callBooks(`/api/books/${bookId}/stock`, req.token, { method: 'PATCH', body: JSON.stringify({ delta: 1 }) });
      throw e;
    }
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'books-service injoignable ou erreur serveur' });
  }
});

app.post('/api/loans/:id/return', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Emprunt introuvable' });
    if (loan.userId !== req.user.sub && !isStaff(req.user)) return res.status(403).json({ error: 'Accès refusé' });
    if (loan.returnedAt) return res.status(409).json({ error: 'Déjà retourné' });
    const r = await callBooks(`/api/books/${loan.bookId}/stock`, req.token, {
      method: 'PATCH', body: JSON.stringify({ delta: 1 }) });
    if (!r.ok) return res.status(502).json({ error: 'Mise à jour du stock impossible' });
    loan.returnedAt = new Date();
    await loan.save();
    res.json(loan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/loans', auth, async (req, res) => {
  const filter = isStaff(req.user) && req.query.all === 'true' ? {} : { userId: req.user.sub };
  res.json(await Loan.find(filter).sort({ borrowedAt: -1 }));
});

app.get('/api/loans/overdue', auth, async (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: 'Accès refusé' });
  res.json(await Loan.find({ returnedAt: null, dueDate: { $lt: new Date() } }).sort({ dueDate: 1 }));
});

let server;
mongoose
  .connect(MONGO_URL, { serverSelectionTimeoutMS: 60000 })
  .then(() => {
    console.log('MongoDB connecté');
    server = app.listen(PORT, () => console.log(`loans-service sur :${PORT}`));
  })
  .catch((e) => { console.error(e); process.exit(1); });

const shutdown = () => {
  if (server) server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  else process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
