import React from 'react';

export const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorSchemes = {
    indigo: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30',
    cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    rose: 'from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
        </div>
        {Icon && (
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br border ${colorSchemes[color] || colorSchemes.indigo} group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-7 h-7" />
          </div>
        )}
      </div>
    </div>
  );
};
