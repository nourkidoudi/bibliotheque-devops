import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Connexion réussie ! Bienvenue.');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Identifiants incorrects ou compte inactif.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-[#edf1ec] p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl min-h-[720px] grid lg:grid-cols-[1.05fr_.95fr] rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(31,62,56,.14)] border border-[#dde4de] bg-white">
        <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#153f3d] text-white overflow-hidden">
          <div className="absolute right-[-70px] top-[-70px] w-64 h-64 rounded-full border border-[#d7bd76]/20" />
          <div>
            <div className="w-14 h-14 rounded-xl border border-[#d7bd76]/70 bg-[#1c514e] flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-[#d7bd76]" />
            </div>
            <p className="mt-14 text-[11px] tracking-[0.24em] uppercase text-[#d7bd76] font-bold">Le Scriptarium</p>
            <h1 className="mt-5 max-w-md font-serif text-5xl leading-[1.12] text-[#f5f2e8]">
              Votre campus, une bibliothèque à vous.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#bdd0cb]">
              Consultez le catalogue, empruntez les ouvrages disponibles et gardez vos lectures à portée de main.
            </p>
          </div>
          <p className="font-serif italic text-[#d7e1de]">« Lire, c’est habiter le monde autrement. »</p>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md mx-auto">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[#8a9b95] font-bold mb-3">Votre compte</p>
            <h2 className="text-4xl font-serif text-[#1d3531] mb-2">Bienvenue</h2>
            <p className="text-sm text-[#7d8e89] mb-8">Accédez à votre espace universitaire</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#526660] mb-1.5">Adresse e-mail institutionnelle</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8a9b95]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nom@universite.tn"
                    required
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#526660] mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8a9b95]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#3e776c] hover:bg-[#315f56] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#e3e8e3]">
              <p className="text-[11px] font-bold text-[#8a9b95] uppercase tracking-wider mb-2">Comptes de démonstration rapide</p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => fillDemo('admin@library.com', 'Admin123!')} className="px-2 py-2 rounded-lg bg-[#f4f6f2] text-[#3e776c] border border-[#dfe6df] text-[11px] font-semibold">Admin</button>
                <button type="button" onClick={() => fillDemo('librarian@library.com', 'Librarian123!')} className="px-2 py-2 rounded-lg bg-[#f4f6f2] text-[#3e776c] border border-[#dfe6df] text-[11px] font-semibold">Bibliothécaire</button>
                <button type="button" onClick={() => fillDemo('student@university.com', 'Student123!')} className="px-2 py-2 rounded-lg bg-[#f4f6f2] text-[#3e776c] border border-[#dfe6df] text-[11px] font-semibold">Étudiant</button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-[#7d8e89]">
              Nouveau à l'université ?{' '}
              <Link to="/register" className="font-bold text-[#3e776c]">Créer un compte étudiant</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
