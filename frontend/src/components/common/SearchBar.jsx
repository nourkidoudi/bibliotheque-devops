import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({ value, onChange, placeholder = 'Rechercher...' }) => {
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    setInternalValue(e.target.value);
    onChange(e.target.value);
  };

  const handleClear = () => {
    setInternalValue('');
    onChange('');
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="glass-input w-full pl-10 pr-9 py-2.5 rounded-xl text-sm placeholder-slate-500 transition-all duration-200"
      />
      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
