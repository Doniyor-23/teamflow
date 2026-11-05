import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api'; import { useAuth } from './auth'; import { useToast } from './ui';
const Ctx = createContext({ socket: null, unread: 0, setUnread: () => {}, online: new Set(), epoch: 0 });
export const useRT = () => useContext(Ctx);
const ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth(); const toast = useToast(); const [socket, setSocket] = useState(null); const [unread, setUnread] = useState(0); const [online, setOnline] = useState(new Set()); const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!user) return; let first = true; const s = io(ORIGIN, { auth: { token: localStorage.getItem('tf_token') } });
    s.on('connect', () => { if (!first) setEpoch((e) => e + 1); first = false; api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {}); });
    s.on('presence:list', (l) => setOnline(new Set(l)));
    s.on('presence', ({ userId, online: o }) => setOnline((p) => { const n = new Set(p); o ? n.add(userId) : n.delete(userId); return n; }));
    s.on('notification', (n) => { setUnread((c) => c + 1); toast(n.message); });
    setSocket(s); return () => { s.disconnect(); setSocket(null); };
  }, [user?._id]);
  return <Ctx.Provider value={{ socket, unread, setUnread, online, epoch }}>{children}</Ctx.Provider>;
};
