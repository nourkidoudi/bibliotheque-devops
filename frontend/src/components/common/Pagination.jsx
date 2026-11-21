import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <span className="text-sm font-medium text-slate-300 px-4 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
        Page <span className="text-indigo-400 font-bold">{currentPage}</span> sur{' '}
        <span className="text-white">{totalPages}</span>
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
