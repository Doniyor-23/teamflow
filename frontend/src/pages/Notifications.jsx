import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap'; import { Bell, CheckCheck } from 'lucide-react';
import api, { errMsg } from '../api'; import { useRT } from '../socket'; import { Empty, Skeletons, reduced, useToast } from '../ui';
const Item = ({ n, onRead }) => {
  const ref = useRef(); useGSAP(() => { if (n.fresh && !reduced()) gsap.from(ref.current, { y: -12, opacity: 0, duration: 0.3 }); }, { scope: ref });
  return (<li ref={ref} className={`flex items-center justify-between gap-3 py-3 text-sm ${n.read ? 'opacity-60' : ''}`}>
    <Link to={n.link || '/'} onClick={() => !n.read && onRead(n)} className="min-w-0 flex-1"><p className="font-medium">{n.message}</p>
      <p className="text-xs text-slate-500">{n.type.replace('_', ' ')} · {new Date(n.createdAt).toLocaleString()}</p></Link>
    {!n.read && <button className="btn-ghost" onClick={() => onRead(n)}>Mark read</button>}</li>);
};
const Notifications = () => {
  const { socket, setUnread, epoch } = useRT(); const toast = useToast(); const [items, setItems] = useState(null);
  const load = () => api.get('/notifications').then((r) => { setItems(r.data.notifications); setUnread(r.data.unread); }).catch((e) => { toast(errMsg(e), 'error'); setItems([]); });
  useEffect(() => { load(); }, [epoch]);
  useEffect(() => { if (!socket) return; const f = (n) => setItems((l) => (l ? [{ ...n, fresh: true }, ...l.filter((x) => x._id !== n._id)] : l)); socket.on('notification', f); return () => socket.off('notification', f); }, [socket]);
  const one = async (n) => { try { await api.patch(`/notifications/${n._id}/read`); setItems((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x))); setUnread((c) => Math.max(0, c - 1)); } catch (e) { toast(errMsg(e), 'error'); } };
  const all = async () => { try { await api.patch('/notifications/read-all'); setItems((l) => l.map((x) => ({ ...x, read: true }))); setUnread(0); } catch (e) { toast(errMsg(e), 'error'); } };
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Notifications</h1><button className="btn-ghost" onClick={all}><CheckCheck size={16} />Mark all as read</button></div>
    {!items ? <Skeletons n={2} /> : !items.length ? <Empty icon={Bell} title="You're all caught up" text="Assignments, deadlines and project invitations will appear here." /> :
      <ul className="card divide-y divide-slate-100 dark:divide-slate-800">{items.map((n) => <Item key={n._id} n={n} onRead={one} />)}</ul>}</div>);
};
export default Notifications;
