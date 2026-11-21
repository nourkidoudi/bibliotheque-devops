import React, { Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BooksPage } from './pages/books/BooksPage';
import { BookDetailPage } from './pages/books/BookDetailPage';
import { MyLoansPage } from './pages/loans/MyLoansPage';
import { LoansManagementPage } from './pages/loans/LoansManagementPage';
import { UsersPage } from './pages/users/UsersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Error boundary to prevent white/dark blank screen on any child error
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Une anomalie d'affichage est survenue</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            {this.state.error?.message || 'Erreur interne de rendu React.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/dashboard';
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Recharger le tableau de bord
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#f8fafc',
            border: '1px solid #1f293d',
            borderRadius: '0.75rem',
            fontSize: '13px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#111827',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#111827',
            },
          },
        }}
      />

      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/my-loans" element={<MyLoansPage />} />
          <Route
            path="/loans-management"
            element={
              <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                <LoansManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Redirect root & fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
