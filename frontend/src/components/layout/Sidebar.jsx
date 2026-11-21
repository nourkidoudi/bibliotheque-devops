import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  BookmarkCheck,
  ClipboardList,
  Users,
  Bell,
  User,
  Library,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar = ({ isMobile, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const navItems = [
    {
      to: '/dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      roles: ['student', 'librarian', 'admin'],
    },
    {
      to: '/books',
      label: 'Catalogue Ouvrages',
      icon: BookOpen,
      roles: ['student', 'librarian', 'admin'],
    },
    {
      to: '/my-loans',
      label: 'Mes Emprunts',
      icon: BookmarkCheck,
      roles: ['student'],
    },
    {
      to: '/loans-management',
      label: 'Gestion des Emprunts',
      icon: ClipboardList,
      roles: ['librarian', 'admin'],
    },
    {
      to: '/users',
      label: 'Utilisateurs & Rôles',
      icon: Users,
      roles: ['admin'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['student', 'librarian', 'admin'],
    },
    {
      to: '/profile',
      label: 'Mon Profil',
      icon: User,
      roles: ['student', 'librarian', 'admin'],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 h-full flex flex-col bg-[#153f3d] border-r border-[#214e4b] text-white">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex items-center space-x-3">
        <div className="w-11 h-11 rounded-xl border border-[#d7bd76]/70 bg-[#1c514e] flex items-center justify-center shadow-lg">
          <Library className="w-6 h-6 text-[#d7bd76]" />
        </div>
        <div>
          <h1 className="font-serif text-lg tracking-tight text-white">
            Le Scriptarium
          </h1>
          <p className="text-[11px] text-[#b8cbc6] font-medium">Bibliothèque universitaire</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-[#8fb0a8] px-3 uppercase tracking-[0.18em] mb-3">
          Espace de travail
        </p>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={isMobile ? onClose : undefined}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#2a625d] text-white shadow-lg border-l-2 border-[#d7bd76] font-semibold'
                    : 'text-[#d3dfdc] hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User summary footer */}
      <div className="p-4 border-t border-white/10">
        <div className="p-3 rounded-xl bg-[#0f3533] border border-white/10 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#d7bd76]/20 text-[#e8d49b] flex items-center justify-center font-bold text-sm">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
