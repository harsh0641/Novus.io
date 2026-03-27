import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { DarkModeProvider } from './hooks/useDarkMode';
import LoadingSpinner from './components/LoadingSpinner';
import Home         from './pages/Home';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import Applications from './pages/Applications';
import ColdEmail    from './pages/ColdEmail';
import Settings     from './pages/Settings';

// ── Reads from the correct localStorage key ───────────────────────────────────
function ProtectedRoute({ children }) {
  const token  = localStorage.getItem('careersync_token');
  const userId = localStorage.getItem('careersync_user_id');
  return (token && userId) ? children : <Navigate to="/login" replace />;
}

function AppInner() {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (booting) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/"             element={<Home />} />
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
      <Route path="/cold-email"   element={<ProtectedRoute><ColdEmail /></ProtectedRoute>} />
      <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
          <AppInner />
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
}