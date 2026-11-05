import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
gsap.registerPlugin(useGSAP);
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random(); setItems((i) => [...i, { id, message, type }]); setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 4000);
  }, []);
  return (<ToastCtx.Provider value={push}>{children}
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status">{items.map((t) => <Toast key={t.id} {...t} />)}</div></ToastCtx.Provider>);
};
const Toast = ({ message, type }) => {
  const ref = useRef(); useGSAP(() => { if (!reduced()) gsap.from(ref.current, { x: 40, opacity: 0, duration: 0.3 }); });
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;
  return <div ref={ref} className="flex max-w-sm items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"><Icon size={16} className={type === 'error' ? 'text-red-400' : 'text-emerald-400'} />{message}</div>;
};
export const Modal = ({ title, onClose, children, drawer }) => {
  const box = useRef(), back = useRef();
  useGSAP(() => { if (reduced()) return; gsap.from(back.current, { opacity: 0, duration: 0.2 }); gsap.from(box.current, drawer ? { x: 60, opacity: 0, duration: 0.3 } : { y: 20, opacity: 0, scale: 0.97, duration: 0.25 }); });
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const close = () => { if (reduced()) return onClose(); gsap.to(box.current, { opacity: 0, y: 10, duration: 0.15, onComplete: onClose }); };
  return createPortal(
    <div ref={back} className={`fixed inset-0 z-50 flex bg-slate-900/50 ${drawer ? 'justify-end' : 'items-center justify-center p-4'}`} onMouseDown={(e) => e.target === back.current && close()}>
      <div ref={box} role="dialog" aria-modal="true" className={`overflow-y-auto bg-white shadow-xl dark:bg-slate-900 ${drawer ? 'h-full w-full max-w-md' : 'max-h-[90vh] w-full max-w-lg rounded-xl'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold">{title}</h2>
          <button onClick={close} aria-label="Close" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></div>
        <div className="p-5">{children}</div></div></div>, document.body);
};
export const Confirm = ({ message, onConfirm, onCancel, label }) => (
  <Modal title="Are you sure?" onClose={onCancel}><p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{message}</p>
    <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn !bg-red-600 hover:!bg-red-700" onClick={onConfirm}>{label || 'Delete'}</button></div></Modal>);
export const Empty = ({ icon: Icon, title, text, action }) => (
  <div className="card flex flex-col items-center py-12 text-center"><Icon size={32} className="mb-3 text-indigo-500" /><h3 className="font-semibold">{title}</h3>
    <p className="mb-4 mt-1 max-w-sm text-sm text-slate-500">{text}</p>{action}</div>);
export const Skeletons = ({ n = 3, h = 'h-24' }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: n }, (_, i) => <div key={i} className={`skeleton ${h}`} />)}</div>;
export const Counter = ({ value }) => {
  const ref = useRef();
  useGSAP(() => { const o = { v: 0 }; if (reduced()) { ref.current.textContent = value; return; }
    gsap.to(o, { v: value, duration: 1, ease: 'power2.out', onUpdate: () => { ref.current.textContent = Math.round(o.v); } }); }, { dependencies: [value] });
  return <span ref={ref}>0</span>;
};
export const PRIORITY = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' };
export const COLS = [['backlog', 'Backlog'], ['todo', 'Todo'], ['in_progress', 'In Progress'], ['in_review', 'In Review'], ['done', 'Done']];
export const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—');
export const dateVal = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const name = (u) => (u ? `${u.firstName} ${u.lastName}` : 'Unassigned');
export const Avatar = ({ user, size = 28 }) => user?.avatar
  ? <img src={user.avatar} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
  : <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}</span>;
