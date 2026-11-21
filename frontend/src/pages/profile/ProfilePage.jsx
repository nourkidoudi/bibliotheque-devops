import React, { useState } from 'react';
import { User, Lock, Mail, Building, Hash, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { Badge } from '../../components/common/Badge';
import toast from 'react-hot-toast';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: user?.department || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await updateProfile(profileData);
      toast.success('Profil mis à jour avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Mot de passe modifié avec succès !');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mot de passe actuel incorrect.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#18312f] tracking-tight">
          Mon Compte & Sécurité
        </h1>
        <p className="text-xs sm:text-sm text-[#657a73] mt-1">
          Gérez vos informations personnelles et paramètres d'authentification
        </p>
      </div>

      {/* Account Overview Header */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 flex items-center space-x-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">
              {user?.firstName} {user?.lastName}
            </h2>
            <Badge variant="purple">{user?.role}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          {user?.studentId && (
            <p className="text-xs text-indigo-400 font-mono mt-1">ID: {user?.studentId}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Informations Personnelles</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prénom</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) =>
                  setProfileData({ ...profileData, firstName: e.target.value })
                }
                required
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nom</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) =>
                  setProfileData({ ...profileData, lastName: e.target.value })
                }
                required
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Département</label>
              <input
                type="text"
                value={profileData.department}
                onChange={(e) =>
                  setProfileData({ ...profileData, department: e.target.value })
                }
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{updatingProfile ? 'Enregistrement...' : 'Mettre à jour le profil'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Sécurité du Mot de Passe</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                required
                placeholder="••••••••"
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                required
                placeholder="Min. 8 caractères"
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmation du nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordData.confirmNewPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmNewPassword: e.target.value,
                  })
                }
                required
                placeholder="Retapez mot de passe"
                className="glass-input w-full px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{updatingPassword ? 'Modification...' : 'Modifier le mot de passe'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
