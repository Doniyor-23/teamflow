import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(!!localStorage.getItem('tf_token'));
  useEffect(() => { if (!localStorage.getItem('tf_token')) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('tf_token')).finally(() => setLoading(false)); }, []);
  const accept = ({ data }) => { localStorage.setItem('tf_token', data.token); setUser(data.user); };
  const value = { user, loading, login: (b) => api.post('/auth/login', b).then(accept), register: (b) => api.post('/auth/register', b), verify: (b) => api.post('/auth/verify', b).then(accept),
    logout: () => { localStorage.removeItem('tf_token'); setUser(null); } };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
export const Protected = ({ children }) => { const { user, loading } = useAuth(); if (loading) return <div className="p-10"><div className="skeleton h-10" /></div>; return user ? children : <Navigate to="/login" replace />; };
