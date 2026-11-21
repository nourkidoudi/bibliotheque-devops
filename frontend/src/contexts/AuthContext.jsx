import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { setAccessToken, refreshAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restauration de session : le cookie HttpOnly permet d'obtenir un nouveau
  // token d'accès en mémoire sans jamais toucher à localStorage.
  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshAccessToken();
        const profile = await authService.getProfile();
        const data = profile.data || profile;
        setUser(data.user || data);
      } catch (error) {
        setAccessToken(null);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const { accessToken, user: userData } = res.data || res;

    setAccessToken(accessToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    const { accessToken, user: newUser } = res.data || res;

    if (accessToken) {
      setAccessToken(accessToken);
      setUser(newUser);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Ignore error and clean up
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  const updateProfile = async (data) => {
    const res = await authService.updateProfile(data);
    const updated = res.data || res;
    setUser(updated);
    return updated;
  };

  const refreshSession = async () => {
    await refreshAccessToken();
    const profile = await authService.getProfile();
    const data = profile.data || profile;
    const refreshedUser = data.user || data;
    setUser(refreshedUser);
    return refreshedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
