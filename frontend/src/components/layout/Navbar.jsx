import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        setUnreadCount(res.count || 0);
      } catch (e) {
        // Silent catch for poll
      }
    };
    if (user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000); // 30s poll
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#fbfcf8]/95 border-b border-[#dde4de] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs text-[#60736d] hidden sm:inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#55a77c] animate-pulse"></span>
          Bibliothèque / <strong className="text-[#243d39]">Vue d'ensemble</strong>
        </span>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User profile dropdown info */}
        <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-slate-800">
          <Link
            to="/profile"
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
