import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Hash, Building, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    department: 'Informatique',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        studentId: formData.studentId,
        department: formData.department,
        password: formData.password,
      });
      toast.success('Compte créé avec succès ! Bienvenue.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
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
              Créez votre espace étudiant et gardez vos lectures à portée de main.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-lg mx-auto">
            <p className="text-[11px] tracking-[0.18em] uppercase text-[#8a9b95] font-bold mb-2">Nouveau compte</p>
            <h1 className="text-3xl font-serif text-[#1d3531]">Créer un compte</h1>
            <p className="text-xs text-[#7d8e89] mt-1 mb-5">Inscription réservée aux étudiants</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['firstName', 'Prénom', 'Nour', User],
                  ['lastName', 'Nom', 'Kidoudi', User],
                ].map(([name, label, placeholder, Icon]) => (
                  <div key={name}>
                    <label className="block text-xs font-semibold text-[#526660] mb-1">{label} *</label>
                    <div className="relative">
                      <Icon className="w-4 h-4 absolute left-3 top-2.5 text-[#8a9b95]" />
                      <input name={name} value={formData[name]} onChange={handleChange} required placeholder={placeholder} className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#526660] mb-1">E-mail *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#8a9b95]" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="etudiant@iset-tozeur.tn" className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#526660] mb-1">Numéro Carte Étudiant</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-2.5 text-[#8a9b95]" />
                    <input name="studentId" value={formData.studentId} onChange={handleChange} placeholder="STU-2026-089" className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#526660] mb-1">Département</label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-[#8a9b95]" />
                    <select name="department" value={formData.department} onChange={handleChange} className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm">
                      <option value="Informatique & DevOps">Informatique & DevOps</option>
                      <option value="Réseaux & Télécoms">Réseaux & Télécoms</option>
                      <option value="Génie Mécanique">Génie Mécanique</option>
                      <option value="Sciences Économiques">Sciences Économiques</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['password', 'Mot de passe', 'Min. 8 car.'],
                  ['confirmPassword', 'Confirmation', 'Retapez'],
                ].map(([name, label, placeholder]) => (
                  <div key={name}>
                    <label className="block text-xs font-semibold text-[#526660] mb-1">{label} *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#8a9b95]" />
                      <input type="password" name={name} value={formData[name]} onChange={handleChange} required placeholder={placeholder} className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" disabled={loading} className="w-full py-2.5 px-4 rounded-xl bg-[#3e776c] hover:bg-[#315f56] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <span>{loading ? 'Création en cours...' : "S'inscrire"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-[#7d8e89]">
              Déjà inscrit ?{' '}
              <Link to="/login" className="font-bold text-[#3e776c]">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
