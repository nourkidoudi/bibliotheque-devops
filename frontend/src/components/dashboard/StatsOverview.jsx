import React from 'react';
import { BookOpen, BookmarkCheck, AlertCircle, Users, CheckCircle2 } from 'lucide-react';
import { StatsCard } from '../common/StatsCard';

export const StatsOverview = ({ stats, role }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatsCard
        title="Total Ouvrages"
        value={stats?.totalBooks || stats?.totalOuvrages || 12}
        subtitle="Catalogue centralisé"
        icon={BookOpen}
        color="indigo"
      />
      <StatsCard
        title="Emprunts en cours"
        value={stats?.activeLoans || 0}
        subtitle="Livres actuellement prêtés"
        icon={BookmarkCheck}
        color="cyan"
      />
      <StatsCard
        title="Retards & Rappels"
        value={stats?.overdueLoans || 0}
        subtitle="Dépassements d'échéance"
        icon={AlertCircle}
        color="rose"
      />
      {role === 'admin' ? (
        <StatsCard
          title="Utilisateurs Inscrits"
          value={stats?.totalUsers || 24}
          subtitle="Étudiants & personnels"
          icon={Users}
          color="emerald"
        />
      ) : (
        <StatsCard
          title="Retours Enregistrés"
          value={stats?.returnedLoans || 0}
          subtitle="Cycle de prêt respecté"
          icon={CheckCircle2}
          color="emerald"
        />
      )}
    </div>
  );
};
