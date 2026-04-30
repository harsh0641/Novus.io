import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('careersync_token');
      const userId = localStorage.getItem('careersync_user_id');
      if (token && userId) {
        try {
          const res = await authAPI.getUser(userId);
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Session restore failed:", err);
          handleLogout();
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const handleLogin = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res.data.success) {
      localStorage.setItem('careersync_token', res.data.token);
      localStorage.setItem('careersync_user_id', res.data.user.id);
      setUser(res.data.user);
    }
    return res.data;
  };

  const handleRegister = async (data) => {
    const res = await authAPI.register(data);
    if (res.data.success) {
      localStorage.setItem('careersync_token', res.data.token);
      localStorage.setItem('careersync_user_id', res.data.user.id);
      setUser(res.data.user);
    }
    return res.data;
  };

  const handleLogout = () => {
    localStorage.removeItem('careersync_token');
    localStorage.removeItem('careersync_user_id');
    setUser(null);
  };

  const refreshUser = async () => {
    const userId = localStorage.getItem('careersync_user_id');
    if (!userId) return;
    try {
      const res = await authAPI.getUser(userId);
      if (res.data.success) setUser(res.data.user);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshUser,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};