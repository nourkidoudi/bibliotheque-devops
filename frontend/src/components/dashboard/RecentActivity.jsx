import React from 'react';
import { Bookmark, RotateCcw, AlertTriangle, BookCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const RecentActivity = ({ activities = [] }) => {
  const defaultActivities = [
    {
      id: '1',
      type: 'borrow',
      user: 'Jane Doe',
      book: 'Clean Architecture',
      time: new Date(Date.now() - 1000 * 60 * 35),
    },
    {
      id: '2',
      type: 'return',
      user: 'Sarah Connor',
      book: 'Kubernetes Up & Running',
      time: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      id: '3',
      type: 'overdue',
      user: 'Karim Mansour',
      book: 'Terraform: Up & Running',
      time: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      id: '4',
      type: 'borrow',
      user: 'Amine Trabelsi',
      book: 'Designing Data-Intensive Apps',
      time: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
  ];

  const list = activities.length > 0 ? activities : defaultActivities;

  const getIcon = (type) => {
    switch (type) {
      case 'borrow':
        return <Bookmark className="w-4 h-4 text-indigo-400" />;
      case 'return':
        return <RotateCcw className="w-4 h-4 text-emerald-400" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <BookCheck className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getLabel = (type) => {
    switch (type) {
      case 'borrow':
        return 'Nouvel emprunt';
      case 'return':
        return 'Retour enregistré';
      case 'overdue':
        return 'Échéance dépassée';
      default:
        return 'Mouvement';
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Activités Récentes</h3>
          <p className="text-xs text-slate-400 mt-1">Flux en temps réel des opérations</p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
      </div>

      <div className="space-y-4">
        {list.map((act) => (
          <div
            key={act.id}
            className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 transition"
          >
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 mt-0.5">
              {getIcon(act.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{act.user}</span>
                <span className="text-[10px] text-slate-400">
                  {act.time
                    ? formatDistanceToNow(new Date(act.time), { addSuffix: true, locale: fr })
                    : 'récemment'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-slate-300 font-medium">{getLabel(act.type)} :</span>{' '}
                <span className="text-indigo-300 truncate font-medium">{act.book}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
