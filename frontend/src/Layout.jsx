import { useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap';
import { LayoutDashboard, CheckSquare, FolderKanban, Columns3, Users, MessageSquare, CalendarDays, Bell, Settings, LogOut, Moon, Sun, Menu, ShieldCheck } from 'lucide-react'; import { useRT } from './socket';
import { useAuth } from './auth'; import { reduced, Avatar } from './ui';
const NAV = [['/', 'Dashboard', LayoutDashboard], ['/my-tasks', 'My Tasks', CheckSquare], ['/projects', 'Projects', FolderKanban], ['/kanban', 'Kanban Board', Columns3],
  ['/team', 'Team', Users], ['/chat', 'Chat', MessageSquare], ['/calendar', 'Calendar', CalendarDays], ['/notifications', 'Notifications', Bell], ['/settings', 'Settings', Settings]];
const Layout = () => {
  const { user, logout } = useAuth(); const { unread } = useRT(); const items = user.role === 'member' ? NAV : [...NAV, ['/admin', 'Admin', ShieldCheck]]; const [open, setOpen] = useState(false); const main = useRef(); const side = useRef(); const loc = useLocation();
  useGSAP(() => { if (!reduced()) gsap.from('.nav-item', { x: -16, opacity: 0, stagger: 0.04, duration: 0.35, clearProps: 'all' }); }, { scope: side });
  useGSAP(() => { if (!reduced()) gsap.fromTo(main.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, clearProps: 'all' }); }, { dependencies: [loc.pathname] });
  const toggle = () => { const d = document.documentElement.classList.toggle('dark'); localStorage.setItem('tf_theme', d ? 'dark' : 'light'); };
  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside ref={side} className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 p-4 text-slate-300 transition-transform lg:static lg:translate-x-0 ${open ? '' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500"><Columns3 size={18} /></span>TeamFlow</div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">{items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-500/20 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <Icon size={18} />{label}{to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-indigo-500 px-2 text-xs text-white">{unread}</span>}</NavLink>))}</nav>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4"><Avatar user={user} size={36} />
          <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium text-white">{user.firstName} {user.lastName}</p><p className="truncate text-xs">{user.jobTitle}</p></div>
          <button onClick={logout} aria-label="Sign out" className="rounded p-2 hover:bg-white/10"><LogOut size={16} /></button></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button><span className="hidden lg:block" />
          <button className="btn-ghost" onClick={toggle} aria-label="Toggle dark mode"><Sun size={16} className="hidden dark:block" /><Moon size={16} className="dark:hidden" /></button>
        </header>
        <main ref={main} className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>);
};
export default Layout;
