import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Chargement...' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin`}
      />
      {text && <p className="text-sm text-slate-400 font-medium">{text}</p>}
    </div>
  );
};
