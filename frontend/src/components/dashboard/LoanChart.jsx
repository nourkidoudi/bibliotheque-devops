import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const LoanChart = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { name: 'Juin 2026', emprunts: 14, retours: 10 },
    { name: 'Juil 2026', emprunts: 8, retours: 7 },
    { name: 'Août 2026', emprunts: 12, retours: 11 },
    { name: 'Sep 2026', emprunts: 38, retours: 25 },
    { name: 'Oct 2026', emprunts: 52, retours: 44 },
    { name: 'Nov 2026', emprunts: 41, retours: 36 },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Dynamique des Prêts & Retours
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Évolution mensuelle des mouvements en bibliothèque
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
            <span className="text-slate-300">Emprunts</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">Retours</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#1f293d',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              }}
            />
            <Area
              type="monotone"
              dataKey="emprunts"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorLoans)"
            />
            <Area
              type="monotone"
              dataKey="retours"
              stroke="#06b6d4"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorReturns)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
