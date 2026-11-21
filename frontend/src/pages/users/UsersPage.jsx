import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Search, Sparkles } from 'lucide-react';
import { userService } from '../../services/userService';
import { Badge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const UsersPage = () => {
  const { refreshSession } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await userService.getUsers(params);
      const payload = res.data || res;
      const list = Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload)
        ? payload
        : [];
      setUsers(list);
      if (payload?.pagination) {
        setTotalPages(payload.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await userService.getUserStats();
      setStats(res.data || null);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, roleFilter, search]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userService.updateUserRole(userId, newRole);
      await refreshSession();
      toast.success('Rôle mis à jour !');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await userService.updateUserStatus(userId, !currentStatus);
      toast.success(currentStatus ? 'Utilisateur désactivé.' : 'Utilisateur réactivé.');
      fetchUsers();
    } catch (err) {
      toast.error('Erreur lors de la modification du statut.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Gestion des Utilisateurs & Rôles
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Administration globale : Attribution des privilèges (étudiant, bibliothécaire, admin)
        </p>
      </div>

      {/* Filter and Search */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Rechercher par nom, e-mail ou identifiant étudiant..."
          />
        </div>

        <div className="flex items-center space-x-2">
          {['', 'student', 'librarian', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => {
                setRoleFilter(role);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                roleFilter === role
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {role === ''
                ? 'Tous'
                : role === 'student'
                ? 'Étudiants'
                : role === 'librarian'
                ? 'Bibliothécaires'
                : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner size="lg" text="Chargement des comptes..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun utilisateur trouvé"
          description="Aucun compte ne correspond à votre filtre de recherche."
        />
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Département & ID</th>
                  <th className="py-3.5 px-4">Rôle Système</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {u.firstName?.[0]}
                        </div>
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 pl-9">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{u.department || 'Non spécifié'}</div>
                      <div className="text-[11px] text-indigo-400 font-mono">
                        {u.studentId || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="glass-input px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 cursor-pointer"
                      >
                        <option value="student">Étudiant</option>
                        <option value="librarian">Bibliothécaire</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.isActive ? 'success' : 'danger'}>
                        {u.isActive ? 'Actif' : 'Bloqué'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusToggle(u.id, u.isActive)}
                        className={`p-1.5 rounded-lg border transition ${
                          u.isActive
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                        title={u.isActive ? 'Suspendre l\'accès' : 'Réactiver le compte'}
                      >
                        {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-800">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
