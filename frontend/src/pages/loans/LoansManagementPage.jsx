import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  AlertOctagon,
  Calendar,
  User,
} from 'lucide-react';
import { loanService } from '../../services/loanService';
import { Badge } from '../../components/common/Badge';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const LoansManagementPage = () => {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await loanService.getAllLoans(params);
      setLoans(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des prêts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [page, statusFilter, search]);

  const handleReturn = async (loanId) => {
    try {
      setProcessingId(loanId);
      await loanService.returnBook(loanId);
      toast.success('Retour validé avec réintégration du stock.');
      fetchLoans();
    } catch (err) {
      toast.error('Erreur lors de la validation du retour.');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayFine = async (loanId) => {
    try {
      setProcessingId(loanId);
      await loanService.payFine(loanId);
      toast.success('Pénalité marquée comme acquittée.');
      fetchLoans();
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement du paiement.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkLost = async (loanId) => {
    if (!window.confirm('Confirmer le statut "Livre Perdu" ? Une pénalité de remplacement sera imputée.')) return;
    try {
      setProcessingId(loanId);
      await loanService.markLost(loanId);
      toast.success('Livre déclaré perdu.');
      fetchLoans();
    } catch (err) {
      toast.error('Erreur lors de l\'opération.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Supervision & Gestion des Prêts
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Module bibliothécaire : Suivi des flux documentaires, régularisation des retours et amendes
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Rechercher par emprunteur, email ou titre du livre..."
          />
        </div>

        <div className="flex items-center space-x-2">
          {['', 'active', 'overdue', 'returned'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status === ''
                ? 'Tous'
                : status === 'active'
                ? 'En cours'
                : status === 'overdue'
                ? 'En retard'
                : 'Retournés'}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      {loading ? (
        <LoadingSpinner size="lg" text="Chargement des opérations..." />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun prêt trouvé"
          description="Aucune transaction d'emprunt ne correspond à votre filtre."
        />
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Emprunteur</th>
                  <th className="py-3.5 px-4">Ouvrage</th>
                  <th className="py-3.5 px-4">Dates (Prêt / Échéance)</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Pénalité</th>
                  <th className="py-3.5 px-4 text-right">Actions Bibliothécaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{loan.userName}</div>
                      <div className="text-[11px] text-slate-400">{loan.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200 line-clamp-1 max-w-xs">
                        {loan.bookTitle}
                      </div>
                      <div className="text-[11px] text-slate-400">{loan.bookAuthor}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>Prêté : {new Date(loan.borrowDate).toLocaleDateString('fr-FR')}</div>
                      <div className="text-indigo-400 font-semibold">
                        Échéance : {new Date(loan.dueDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          loan.status === 'returned'
                            ? 'success'
                            : loan.status === 'overdue'
                            ? 'danger'
                            : 'primary'
                        }
                      >
                        {loan.status === 'returned'
                          ? 'Restitué'
                          : loan.status === 'overdue'
                          ? 'En retard'
                          : 'En cours'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {loan.fine > 0 ? (
                        <span
                          className={`font-bold ${
                            loan.finePaid ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {loan.fine} DT {loan.finePaid ? '✓ Réglé' : '⚠ Dû'}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {loan.status !== 'returned' && (
                        <button
                          onClick={() => handleReturn(loan._id)}
                          disabled={processingId === loan._id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-semibold transition"
                          title="Valider la restitution"
                        >
                          <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                          Retour
                        </button>
                      )}

                      {loan.fine > 0 && !loan.finePaid && (
                        <button
                          onClick={() => handlePayFine(loan._id)}
                          disabled={processingId === loan._id}
                          className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 font-semibold transition"
                          title="Encaisser amende"
                        >
                          <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                          Régler
                        </button>
                      )}

                      {loan.status !== 'returned' && loan.status !== 'lost' && (
                        <button
                          onClick={() => handleMarkLost(loan._id)}
                          disabled={processingId === loan._id}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition"
                          title="Déclarer perdu"
                        >
                          <AlertOctagon className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
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
