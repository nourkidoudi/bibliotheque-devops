import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Upload, Plus, Trash2 } from 'lucide-react';

export const AddEditBookModal = ({ isOpen, onClose, book, onSave, categories = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    description: '',
    publisher: '',
    publishYear: new Date().getFullYear(),
    pages: 200,
    language: 'Français',
    location: '',
    totalCopies: 3,
    coverImage: '',
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        category: book.category || (categories[0]?.name || 'Informatique & DevOps'),
        description: book.description || '',
        publisher: book.publisher || '',
        publishYear: book.publishYear || new Date().getFullYear(),
        pages: book.pages || 100,
        language: book.language || 'Français',
        location: book.location || '',
        totalCopies: book.totalCopies || 1,
        coverImage: book.coverImage || '',
      });
      setCoverPreview(book.coverImage || '');
    } else {
      setFormData({
        title: '',
        author: '',
        isbn: '',
        category: categories[0]?.name || 'Informatique & DevOps',
        description: '',
        publisher: '',
        publishYear: new Date().getFullYear(),
        pages: 300,
        language: 'Français',
        location: '',
        totalCopies: 5,
        coverImage: '',
      });
      setCoverPreview('');
      setCoverFile(null);
    }
  }, [book, categories, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['publishYear', 'pages', 'totalCopies'].includes(name) ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData, coverFile);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={book ? 'Modifier l\'ouvrage' : 'Ajouter un nouvel ouvrage au catalogue'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Titre du livre *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
              placeholder="Ex: Clean Code"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Auteur *</label>
            <input
              type="text"
              name="author"
              required
              value={formData.author}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
              placeholder="Ex: Robert C. Martin"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">ISBN *</label>
            <input
              type="text"
              name="isbn"
              required
              value={formData.isbn}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
              placeholder="Ex: 978-0132350884"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm bg-slate-900 text-white"
            >
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Langue</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm bg-slate-900 text-white"
            >
              <option value="Français">Français</option>
              <option value="Anglais">Anglais</option>
              <option value="Arabe">Arabe</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre d'exemplaires totaux
            </label>
            <input
              type="number"
              name="totalCopies"
              min="1"
              value={formData.totalCopies}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Emplacement en rayon
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
              placeholder="Ex: RAYON-B-04"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Éditeur</label>
            <input
              type="text"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Année de publication
            </label>
            <input
              type="number"
              name="publishYear"
              value={formData.publishYear}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              URL Image de Couverture
            </label>
            <input
              type="text"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="https://... ou téléversez ci-dessous"
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm mb-2"
            />

            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium cursor-pointer border border-slate-700 transition">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Téléverser une image locale</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {coverPreview && (
                <span className="text-xs text-emerald-400 font-medium">Image prête</span>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Résumé / Description</label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="glass-input w-full px-3.5 py-2 rounded-xl text-sm resize-none"
              placeholder="Bref résumé du livre..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : book ? 'Mettre à jour' : 'Ajouter le livre'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
