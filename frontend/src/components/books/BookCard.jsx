import React from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../common/Badge';

export const BookCard = ({ book }) => {
  const isAvailable = book.availableCopies > 0;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300">
      {/* Book Cover Container */}
      <div className="relative h-56 bg-gradient-to-t from-slate-950 via-slate-900 to-indigo-950/40 overflow-hidden flex items-center justify-center p-4">
        {book.coverImage ? (
          <img
            src={book.coverImage.startsWith('http') ? book.coverImage : `/${book.coverImage}`}
            alt={book.title}
            className="h-full max-w-[85%] object-cover rounded-lg shadow-xl shadow-black/60 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-24 h-36 rounded-lg bg-indigo-900/40 border border-indigo-500/20 flex flex-col items-center justify-center text-indigo-400 p-2 text-center shadow-lg">
            <BookOpen className="w-8 h-8 mb-2 opacity-70" />
            <span className="text-[10px] font-semibold line-clamp-2">{book.title}</span>
          </div>
        )}

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <Badge variant="purple" size="sm">
            {book.category}
          </Badge>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400 text-xs font-bold border border-white/10">
          <Star className="w-3 h-3 fill-amber-400" />
          <span>{Number(book.rating || 0).toFixed(1)}</span>
        </div>
      </div>

      {/* Book Information */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
            {book.title}
          </h4>
          <p className="text-xs text-slate-400 font-medium mb-3">{book.author}</p>
          <p className="text-xs text-slate-400 line-clamp-2 mb-4">
            {book.description || 'Aucune description fournie.'}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs">
            {isAvailable ? (
              <span className="flex items-center text-emerald-400 font-semibold gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {book.availableCopies} dispo.
              </span>
            ) : (
              <span className="flex items-center text-rose-400 font-semibold gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Épuisé
              </span>
            )}
          </div>

          <Link
            to={`/books/${book.id}`}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition"
          >
            Détails
          </Link>
        </div>
      </div>
    </div>
  );
};
