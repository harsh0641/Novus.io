import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── 1. Restore session on page reload ───────────────────────────────────────
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

  // ── 2. Login Handler (SAVES THE TOKEN) ──────────────────────────────────────
  const handleLogin = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res.data.success) {
      // THIS IS THE CRITICAL PART: Saving the token so client.js can find it
      localStorage.setItem('careersync_token', res.data.token);
      localStorage.setItem('careersync_user_id', res.data.user.id);
      setUser(res.data.user);
    }
    return res.data;
  };

  // ── 3. Register Handler (SAVES THE TOKEN) ───────────────────────────────────
  const handleRegister = async (data) => {
    const res = await authAPI.register(data);
    if (res.data.success) {
      // THIS IS THE CRITICAL PART: Saving the token so client.js can find it
      localStorage.setItem('careersync_token', res.data.token);
      localStorage.setItem('careersync_user_id', res.data.user.id);
      setUser(res.data.user);
    }
    return res.data;
  };

  // ── 4. Logout Handler (CLEARS THE TOKEN) ────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('careersync_token');
    localStorage.removeItem('careersync_user_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};