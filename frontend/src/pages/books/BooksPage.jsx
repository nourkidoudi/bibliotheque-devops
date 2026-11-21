import React, { useState, useEffect } from 'react';
import { Plus, Filter, Sparkles } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import { BookCard } from '../../components/books/BookCard';
import { AddEditBookModal } from '../../components/books/AddEditBookModal';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const BooksPage = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const isStaff = ['librarian', 'admin'].includes(user?.role);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await bookService.getCategories();
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.categories || []);
        setCategories(list);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch books
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        sortBy,
        sortOrder: 'DESC',
      };
      if (search) params.q = search;
      if (selectedCategory) params.category = selectedCategory;
      if (onlyAvailable) params.available = true;

      const res = await bookService.getBooks(params);
      const list = Array.isArray(res?.data)
        ? res.data
        : res?.data?.books || res?.books || [];
      setBooks(list);

      const totalP = res?.data?.totalPages || res?.pagination?.totalPages || res?.totalPages || 1;
      setTotalPages(totalP);
    } catch (err) {
      console.error('Failed to load books:', err);
      toast.error('Erreur lors du chargement des livres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, selectedCategory, search, onlyAvailable, sortBy]);

  const handleCreateBook = async (formData, coverFile) => {
    try {
      const res = await bookService.createBook(formData);
      const newBook = res.data?.book || res.data || res;

      if (coverFile && newBook.id) {
        await bookService.uploadCover(newBook.id, coverFile);
      }

      toast.success('Ouvrage ajouté au catalogue avec succès !');
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout du livre.');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Catalogue des Ouvrages
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Recherchez et empruntez des manuels, traités scientifiques et publications académiques
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un livre</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar Container */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Rechercher par titre, auteur ou ISBN..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input flex-1 px-3 py-2.5 rounded-xl text-xs bg-slate-900 text-white"
            >
              <option value="createdAt">Plus récents</option>
              <option value="rating">Mieux notés</option>
              <option value="title">Titre (A-Z)</option>
              <option value="publishYear">Année d'édition</option>
            </select>

            <label className="flex items-center space-x-2 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => {
                  setOnlyAvailable(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-800"
              />
              <span>En stock</span>
            </label>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === ''
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Toutes les disciplines
          </button>
          {Array.isArray(categories) &&
            categories.map((cat) => (
              <button
                key={cat.id || cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  selectedCategory === cat.name
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <LoadingSpinner size="lg" text="Chargement du catalogue..." />
      ) : !Array.isArray(books) || books.length === 0 ? (
        <EmptyState
          title="Aucun livre trouvé"
          description="Aucun ouvrage ne correspond à vos filtres de recherche. Essayez d'ajuster les critères."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </>
      )}

      {/* Add Book Modal */}
      {modalOpen && (
        <AddEditBookModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleCreateBook}
          categories={categories}
        />
      )}
    </div>
  );
};
