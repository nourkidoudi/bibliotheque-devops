import { useEffect, useState, useCallback } from 'react';

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR');

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api(`/api/users/${mode}`, { method: 'POST', body: form });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="auth">
      <h1>Bibliothèque universitaire</h1>
      <p className="lead">Cherchez un ouvrage, empruntez-le, suivez vos retours.</p>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label>Nom complet<input value={form.name} onChange={set('name')} required /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Mot de passe<input type="password" minLength={8} value={form.password} onChange={set('password')} required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary">{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
      </button>
    </main>
  );
}

function Catalogue({ token, onChange }) {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setBooks(await api(`/api/books?search=${encodeURIComponent(search)}`, { token }));
    } catch (e) { setMsg(e.message); }
  }, [search, token]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const borrow = async (id) => {
    setMsg('');
    try {
      await api('/api/loans', { token, method: 'POST', body: { bookId: id } });
      setMsg('Emprunt enregistré. À rendre sous 14 jours.');
      await load();
      onChange();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <section>
      <h2>Catalogue</h2>
      <input className="search" placeholder="Titre, auteur ou catégorie" value={search} onChange={(e) => setSearch(e.target.value)} />
      {msg && <p className="notice" role="status">{msg}</p>}
      <ul className="books">
        {books.map((b) => (
          <li key={b.id}>
            <div>
              <strong>{b.title}</strong>
              <span>{b.author}{b.category ? ` · ${b.category}` : ''}</span>
            </div>
            <div className="actions">
              <span className={b.stock > 0 ? 'stock ok' : 'stock none'}>
                {b.stock > 0 ? `${b.stock} disponible${b.stock > 1 ? 's' : ''}` : 'Indisponible'}
              </span>
              <button disabled={b.stock === 0} onClick={() => borrow(b.id)}>Emprunter</button>
            </div>
          </li>
        ))}
        {books.length === 0 && <li className="empty">Aucun livre ne correspond à cette recherche.</li>}
      </ul>
    </section>
  );
}

function Loans({ token, user, refreshKey, onChange }) {
  const [loans, setLoans] = useState([]);
  const [all, setAll] = useState(false);
  const staff = ['librarian', 'admin'].includes(user.role);

  const load = useCallback(async () => {
    setLoans(await api(`/api/loans${all ? '?all=true' : ''}`, { token }).catch(() => []));
  }, [token, all]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const giveBack = async (id) => {
    await api(`/api/loans/${id}/return`, { token, method: 'POST' }).catch(() => {});
    await load();
    onChange();
  };

  return (
    <section>
      <h2>{all ? 'Tous les emprunts' : 'Mes emprunts'}</h2>
      {staff && (
        <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Voir tous les emprunts</label>
      )}
      <ul className="loans">
        {loans.map((l) => {
          const late = !l.returnedAt && new Date(l.dueDate) < new Date();
          return (
            <li key={l._id} className={late ? 'late' : ''}>
              <div>
                <strong>{l.bookTitle}</strong>
                <span>{all ? `${l.userName} · ` : ''}emprunté le {fmt(l.borrowedAt)} · retour avant le {fmt(l.dueDate)}</span>
              </div>
              {l.returnedAt
                ? <span className="stock ok">Rendu le {fmt(l.returnedAt)}</span>
                : <button onClick={() => giveBack(l._id)}>{late ? 'En retard : rendre' : 'Rendre'}</button>}
            </li>
          );
        })}
        {loans.length === 0 && <li className="empty">Aucun emprunt pour le moment.</li>}
      </ul>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  if (!session) return <Auth onLogin={setSession} />;
  const { token, user } = session;
  return (
    <>
      <header>
        <strong>Bibliothèque ISET</strong>
        <span>{user.name} ({user.role})</span>
        <button className="link" onClick={() => setSession(null)}>Se déconnecter</button>
      </header>
      <main className="grid">
        <Catalogue token={token} onChange={bump} />
        <Loans token={token} user={user} refreshKey={refreshKey} onChange={bump} />
      </main>
    </>
  );
}
