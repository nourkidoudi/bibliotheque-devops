import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  BookmarkCheck,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { statsService } from '../../services/statsService';
import { bookService } from '../../services/bookService';
import { loanService } from '../../services/loanService';
import { StatsOverview } from '../../components/dashboard/StatsOverview';
import { LoanChart } from '../../components/dashboard/LoanChart';
import { TopBooksChart } from '../../components/dashboard/TopBooksChart';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [myActiveLoans, setMyActiveLoans] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Common for all: featured books
        try {
          const featRes = await bookService.getFeaturedBooks();
          const list = Array.isArray(featRes?.data)
            ? featRes.data
            : featRes?.data?.topRated || featRes?.data?.recent || [];
          if (isMounted) setFeaturedBooks(list);
        } catch (e) {
          console.warn('Failed to load featured books:', e);
          if (isMounted) setFeaturedBooks([]);
        }

        if (['librarian', 'admin'].includes(user?.role)) {
          const [overviewRes, monthlyRes, topRes] = await Promise.allSettled([
            statsService.getOverview(),
            statsService.getMonthlyTrends(),
            statsService.getTopBooks(),
          ]);

          if (isMounted) {
            if (overviewRes.status === 'fulfilled') {
              setStats(overviewRes.value?.data || null);
            }
            if (monthlyRes.status === 'fulfilled') {
              const trends = Array.isArray(monthlyRes.value?.data)
                ? monthlyRes.value.data
                : [];
              setMonthlyTrends(trends);
            }
            if (topRes.status === 'fulfilled') {
              const books = Array.isArray(topRes.value?.data)
                ? topRes.value.data.map((b) => ({
                    title: b.bookTitle || b.title || 'Ouvrage',
                    count: b.count || 1,
                  }))
                : [];
              setTopBooks(books);
            }
          }
        } else {
          // Student view
          try {
            const loansRes = await loanService.getMyActiveLoans();
            const activeList = Array.isArray(loansRes?.data) ? loansRes.data : [];
            if (isMounted) setMyActiveLoans(activeList);
          } catch (e) {
            console.warn('Failed to load active loans:', e);
            if (isMounted) setMyActiveLoans([]);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user) {
      loadDashboardData();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement de votre tableau de bord..." />;
  }

  const isStaff = ['librarian', 'admin'].includes(user?.role);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-[#153f3d] border border-[#214e4b] shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-[#d7bd76]/50 text-[#f1ddb1] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portail Universitaire 2026/2027</span>
          </div>
          <h1 className="dashboard-hero-title text-2xl sm:text-3xl font-serif font-bold text-[#f5f2e8] tracking-tight">
            Bonjour, {user?.firstName} {user?.lastName} ! 👋
          </h1>
          <p className="text-sm text-[#bdd0cb] mt-2 leading-relaxed">
            {isStaff
              ? 'Supervisez en temps réel le catalogue, le suivi des flux de prêts et l\'état des stocks sur l\'infrastructure Kubernetes.'
              : 'Consultez le catalogue, suivez vos dates d\'échéance d\'emprunts et découvrez les nouveaux arrivages académiques.'}
          </p>
        </div>
      </div>

      {/* Staff Dashboard (Admin / Librarian) */}
      {isStaff && (
        <>
          <StatsOverview stats={stats} role={user?.role} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoanChart data={monthlyTrends} />
            <TopBooksChart data={topBooks} />
          </div>

          <RecentActivity />
        </>
      )}

      {/* Student Dashboard */}
      {!isStaff && (
        <div className="space-y-8">
          {/* Active Loans Section */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#18312f] tracking-tight">
                  Mes Emprunts en Cours
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultez vos livres à restituer prochainement
                </p>
              </div>
              <Link
                to="/my-loans"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Voir tout l'historique</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {myActiveLoans.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
                <BookmarkCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">
                  Vous n'avez aucun livre en cours d'emprunt actuellement.
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Explorez le catalogue pour enrichir vos connaissances !
                </p>
                <Link
                  to="/books"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  Consulter le catalogue
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myActiveLoans.map((loan) => (
                  <div
                    key={loan._id}
                    className="p-4 rounded-2xl bg-white border border-[#dde4de] shadow-[0_8px_20px_rgba(31,62,56,.07)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={loan.status === 'overdue' ? 'danger' : 'primary'}
                          size="sm"
                        >
                          {loan.status === 'overdue' ? 'En retard' : 'En cours'}
                        </Badge>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(loan.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#18312f] line-clamp-1">
                        {loan.bookTitle}
                      </h4>
                      <p className="text-xs text-[#657a73] mt-0.5">{loan.bookAuthor}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Renouvellements : {loan.renewals}/2</span>
                      <Link
                        to="/my-loans"
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Gérer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Suggestions de Lectures
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sélection d'ouvrages recommandés par les enseignants
                </p>
              </div>
              <Link
                to="/books"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Explorer tout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.isArray(featuredBooks) &&
                featuredBooks.slice(0, 4).map((book) => (
                  <Link
                    key={book.id}
                    to={`/books/${book.id}`}
                    className="glass-card p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between group"
                  >
                    <div>
                      <Badge variant="purple" size="sm">
                        {book.category}
                      </Badge>
                      <h4 className="text-sm font-bold text-white mt-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{book.author}</p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-medium">
                        {book.availableCopies} dispo.
                      </span>
                      <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
