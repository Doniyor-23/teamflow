import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ListTodo, CheckCircle2, Loader, AlertTriangle } from 'lucide-react';
import api, { errMsg } from '../api'; import { Counter, Skeletons, fmt, name, reduced, PRIORITY, useToast } from '../ui';
const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444'];
const Dashboard = () => {
  const [d, setD] = useState(null); const [p, setP] = useState([]); const ref = useRef(); const toast = useToast();
  useEffect(() => { Promise.all([api.get('/dashboard'), api.get('/projects')]).then(([a, b]) => { setD(a.data); setP(b.data.projects); }).catch((e) => toast(errMsg(e), 'error')); }, []);
  useGSAP(() => { if (d && !reduced()) gsap.from('.stagger', { y: 16, opacity: 0, stagger: 0.07, duration: 0.45, clearProps: 'all' }); }, { scope: ref, dependencies: [!!d] });
  if (!d) return <Skeletons n={4} />;
  const stats = [['Total tasks', d.total, ListTodo], ['Completed', d.completed, CheckCircle2], ['In progress', d.inProgress, Loader], ['Overdue', d.overdue, AlertTriangle]];
  return (<div ref={ref} className="space-y-6"><h1 className="text-2xl font-bold">Dashboard</h1>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([l, v, Icon]) => (
      <div key={l} className="stagger card flex items-center justify-between"><div><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-bold"><Counter value={v} /></p></div>
        <Icon className="text-indigo-500" /></div>))}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="stagger card"><h2 className="mb-2 font-semibold">Tasks by priority</h2><div className="h-56">{d.total ? <ResponsiveContainer><PieChart><Pie data={d.priority} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
        {d.priority.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-slate-500">No tasks yet.</p>}</div></div>
      <div className="stagger card"><h2 className="mb-2 font-semibold">Project progress (%)</h2><div className="h-56">{p.length ? <ResponsiveContainer><BarChart data={p}><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip />
        <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-slate-500">No projects yet.</p>}</div></div></div>
    <div className="grid gap-4 lg:grid-cols-2">{[['Recent activity', d.recent, (t) => `Updated ${fmt(t.updatedAt)}`], ['Upcoming deadlines', d.upcoming, (t) => `Due ${fmt(t.deadline)}`]].map(([title, list, sub]) => (
      <div key={title} className="stagger card"><h2 className="mb-3 font-semibold">{title}</h2>{list.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{list.map((t) => (
        <li key={t._id} className="flex items-center justify-between py-2 text-sm"><div><p className="font-medium">{t.title}</p><p className="text-xs text-slate-500">{t.project?.name} · {(t.assignees?.length ? t.assignees.map(a => name(a)).join(', ') : name(t.assignee))} · {sub(t)}</p></div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY[t.priority]}`}>{t.priority}</span></li>))}</ul> : <p className="text-sm text-slate-500">Nothing here yet.</p>}</div>))}</div></div>);
};
export default Dashboard;
