import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  RotateCcw,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { loanService } from '../../services/loanService';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import toast from 'react-hot-toast';

export const MyLoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const res = await loanService.getMyLoans(params);
      setLoans(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement de vos emprunts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [page, statusFilter]);

  const handleReturn = async (loanId) => {
    if (!window.confirm('Confirmez-vous le retour de ce livre à la bibliothèque ?')) return;
    try {
      setActionLoading(loanId);
      await loanService.returnBook(loanId);
      toast.success('Retour enregistré avec succès ! Merci de votre diligence.');
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du retour.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (loanId) => {
    try {
      setActionLoading(loanId);
      const res = await loanService.renewLoan(loanId);
      toast.success(res.message || 'Emprunt prolongé de 14 jours !');
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de prolonger cet emprunt.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status, dueDate) => {
    const isLate = status === 'overdue' || (status === 'active' && new Date(dueDate) < new Date());

    if (status === 'returned') {
      return (
        <Badge variant="success" size="sm">
          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
          Retourné
        </Badge>
      );
    }
    if (isLate) {
      return (
        <Badge variant="danger" size="sm">
          <AlertTriangle className="w-3 h-3 mr-1 inline" />
          En retard
        </Badge>
      );
    }
    return (
      <Badge variant="primary" size="sm">
        <Clock className="w-3 h-3 mr-1 inline" />
        En cours
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#18312f] tracking-tight">
          Mes Emprunts & Lectures
        </h1>
        <p className="text-xs sm:text-sm text-[#657a73] mt-1">
          Suivez vos prêts en cours, gérez vos prolongations et consultez votre historique
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        {[
          { label: 'Tous mes emprunts', value: '' },
          { label: 'En cours', value: 'active' },
          { label: 'En retard', value: 'overdue' },
          { label: 'Restitués', value: 'returned' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === tab.value
                ? 'bg-[#3e776c] text-white shadow-lg'
                : 'text-[#657a73] hover:text-[#18312f] hover:bg-[#edf1ec]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loans Content */}
      {loading ? (
        <LoadingSpinner size="lg" text="Chargement de vos emprunts..." />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="Aucun emprunt enregistré"
          description="Vous n'avez aucun historique correspondant au filtre sélectionné."
        />
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const isLate =
              loan.status === 'overdue' ||
              (loan.status === 'active' && new Date(loan.dueDate) < new Date());
            const canRenew = loan.status === 'active' && loan.renewals < 2 && !isLate;

            return (
              <div
                key={loan._id}
                className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5 mb-2">
                    {getStatusBadge(loan.status, loan.dueDate)}
                    {loan.renewals > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        (Prolongé {loan.renewals} fois)
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#18312f] truncate">{loan.bookTitle}</h3>
                  <p className="text-xs text-[#657a73] mt-0.5">{loan.bookAuthor}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Emprunté le : {new Date(loan.borrowDate).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Échéance : {new Date(loan.dueDate).toLocaleDateString('fr-FR')}
                    </span>
                    {loan.returnDate && (
                      <span className="text-emerald-400">
                        Retourné le : {new Date(loan.returnDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    {loan.fine > 0 && (
                      <span className="text-rose-400 font-bold">
                        Pénalité de retard : {loan.fine} DT {loan.finePaid ? '(Réglée)' : '(À régler)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {loan.status !== 'returned' && (
                  <div className="flex items-center space-x-2 self-start md:self-center">
                    {canRenew && (
                      <button
                        onClick={() => handleRenew(loan._id)}
                        disabled={actionLoading === loan._id}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Prolonger</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleReturn(loan._id)}
                      disabled={actionLoading === loan._id}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restituer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};
