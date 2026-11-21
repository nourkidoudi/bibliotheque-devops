import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const TopBooksChart = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    { title: 'Designing Data-Intensive Apps', count: 18 },
    { title: 'Kubernetes Up & Running', count: 15 },
    { title: 'Clean Architecture', count: 12 },
    { title: 'Introduction to Algorithms', count: 11 },
    { title: 'Deep Learning (Goodfellow)', count: 9 },
  ];

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
      <div className="mb-6">
        <h3 className="text-base font-bold text-white tracking-tight">
          Ouvrages les plus sollicités
        </h3>
        <p className="text-xs text-slate-400 mt-1">Palmarès des lectures académiques</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              type="category"
              dataKey="title"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={140}
              tickFormatter={(v) => (v.length > 20 ? `${v.substring(0, 18)}...` : v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#1f293d',
                borderRadius: '0.75rem',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(val) => [`${val} emprunts`, 'Total']}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
