import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  BookOpen,
  MapPin,
  Calendar,
  Globe,
  FileText,
  BookmarkCheck,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { bookService } from '../../services/bookService';
import { loanService } from '../../services/loanService';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AddEditBookModal } from '../../components/books/AddEditBookModal';
import toast from 'react-hot-toast';

export const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  // Review Form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isStaff = ['librarian', 'admin'].includes(user?.role);

  const fetchBook = async () => {
    try {
      setLoading(true);
      const res = await bookService.getBookById(id);
      setBook(res.data || res);
    } catch (err) {
      toast.error('Impossible de charger les détails de ce livre.');
      navigate('/books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
    bookService.getCategories().then((res) => setCategories(res.data || []));
  }, [id]);

  const handleBorrow = async () => {
    try {
      setBorrowing(true);
      await loanService.borrowBook(book.id);
      toast.success(`Le livre "${book.title}" a été emprunté pour une durée de 14 jours !`);
      fetchBook();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'emprunt.';
      toast.error(msg);
    } finally {
      setBorrowing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Confirmez-vous le retrait de "${book.title}" du catalogue ?`)) return;
    try {
      await bookService.deleteBook(book.id);
      toast.success('Ouvrage retiré avec succès.');
      navigate('/books');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleUpdate = async (formData, coverFile) => {
    try {
      await bookService.updateBook(book.id, formData);
      if (coverFile) {
        await bookService.uploadCover(book.id, coverFile);
      }
      toast.success('Ouvrage mis à jour avec succès !');
      fetchBook();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Veuillez ajouter un commentaire à votre avis.');
      return;
    }
    setSubmittingReview(true);
    try {
      await bookService.addReview(book.id, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Votre avis a été publié !');
      setReviewComment('');
      fetchBook();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la soumission de l\'avis.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement de l'ouvrage..." />;
  }

  if (!book) return null;

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/books"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour au catalogue</span>
      </Link>

      {/* Main Book Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Cover Image */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[260px] h-84 rounded-2xl bg-gradient-to-t from-slate-950 via-slate-900 to-indigo-950/40 p-4 flex items-center justify-center border border-slate-800 shadow-2xl">
              {book.coverImage ? (
                <img
                  src={book.coverImage.startsWith('http') ? book.coverImage : `/${book.coverImage}`}
                  alt={book.title}
                  className="max-h-full max-w-full object-cover rounded-xl shadow-lg"
                />
              ) : (
                <div className="text-center p-4">
                  <BookOpen className="w-16 h-16 text-indigo-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">{book.title}</p>
                </div>
              )}
            </div>

            {/* Action Buttons for Staff */}
            {isStaff && (
              <div className="flex items-center space-x-2 mt-4 w-full max-w-[260px]">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Detailed Info */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="purple" size="md">
                  {book.category}
                </Badge>
                {book.language && (
                  <Badge variant="default" size="md">
                    <Globe className="w-3 h-3 mr-1 inline" />
                    {book.language}
                  </Badge>
                )}
                <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{Number(book.rating || 0).toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({book.totalRatings || 0} avis)</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {book.title}
              </h1>
              <p className="text-sm font-semibold text-indigo-400 mt-1 mb-4">
                Par {book.author}
              </p>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {book.description || 'Aucun résumé disponible pour cet ouvrage.'}
              </p>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 mb-6">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">ISBN</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">{book.isbn}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Éditeur & Année</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">
                    {book.publisher || 'N/A'} ({book.publishYear || 'N/A'})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Pages</p>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">{book.pages || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Emplacement</p>
                  <p className="text-xs font-bold text-indigo-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {book.location || 'Rayon A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stock and Borrow CTA */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span className="text-sm font-bold text-white">
                    {isAvailable
                      ? `${book.availableCopies} exemplaire(s) disponible(s)`
                      : 'Rupture temporaire de stock'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sur un total de {book.totalCopies} exemplaires dans le fonds documentaire
                </p>
              </div>

              <button
                onClick={handleBorrow}
                disabled={!isAvailable || borrowing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{borrowing ? 'Réservation...' : 'Emprunter ce livre (14 jours)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Avis et Évaluations des Lecteurs</h3>
          </div>
        </div>

        {/* Add Review Form */}
        <form
          onSubmit={handleReviewSubmit}
          className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Donnez votre note :</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1 text-amber-400 focus:outline-none"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= reviewRating ? 'fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Partagez vos impressions sur cet ouvrage universitaire..."
            rows="2"
            className="glass-input w-full px-3 py-2 rounded-xl text-xs resize-none"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {submittingReview ? 'Publication...' : 'Publier mon avis'}
            </button>
          </div>
        </form>

        {/* Reviews List */}
        <div className="space-y-3">
          {(!book.reviews || book.reviews.length === 0) ? (
            <p className="text-xs text-slate-400 italic text-center py-4">
              Soyez le premier à déposer un avis sur cet ouvrage !
            </p>
          ) : (
            book.reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">
                    {rev.userName || 'Étudiant'}
                  </span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-1">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <AddEditBookModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          book={book}
          onSave={handleUpdate}
          categories={categories}
        />
      )}
    </div>
  );
};
