import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap'; import { UserPlus } from 'lucide-react';
import api, { errMsg } from '../api'; import { useAuth } from '../auth'; import { Confirm, Counter, Empty, Modal, Skeletons, name, reduced, useToast } from '../ui';
const Pager = ({ page, pages, set }) => <div className="flex items-center justify-end gap-2 pt-3 text-sm"><button className="btn-ghost" disabled={page <= 1} onClick={() => set(page - 1)}>Previous</button><span>Page {page} of {Math.max(pages, 1)}</span><button className="btn-ghost" disabled={page >= pages} onClick={() => set(page + 1)}>Next</button></div>;
const rowsIn = (ref, dep) => useGSAP(() => { if (!reduced()) gsap.from('tbody tr', { opacity: 0, y: 8, stagger: 0.03, duration: 0.25, clearProps: 'all' }); }, { scope: ref, dependencies: [dep] });
const Overview = () => {
  const [s, setS] = useState(null); const toast = useToast();
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => toast(errMsg(e), 'error')); }, []);
  if (!s) return <Skeletons n={4} />;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Users', s.users], ['Active users', s.active], ['Projects', s.projects], ['Tasks', s.tasks], ['Completed', s.done], ['Overdue', s.overdue], ['Chat groups', s.groups]].map(([l, v]) => (
    <div key={l} className="card"><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-bold"><Counter value={v} /></p></div>))}</div>;
};
const Users = () => {
  const { user: me } = useAuth(); const toast = useToast(); const ref = useRef(); const [d, setD] = useState(null); const [f, setF] = useState({ search: '', role: '', page: 1 }); const [ask, setAsk] = useState(null); const [inv, setInv] = useState(false);
  const load = () => api.get('/admin/users', { params: f }).then((r) => setD(r.data)).catch((e) => { toast(errMsg(e), 'error'); setD({ users: [], pages: 1 }); });
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [f]); rowsIn(ref, d);
  const apply = async () => { try { await api.patch(`/admin/users/${ask.user._id}`, ask.body); toast('User updated'); setAsk(null); load(); } catch (e) { toast(errMsg(e), 'error'); setAsk(null); } };
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'member' });
  const invite = async (e) => { e.preventDefault(); try { await api.post('/admin/users/invite', form); toast('Invitation sent'); setInv(false); load(); } catch (x) { toast(errMsg(x), 'error'); } };
  return (<div ref={ref} className="space-y-3"><div className="flex flex-wrap gap-2"><input className="input !w-56" placeholder="Search name or email" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} />
    <select className="input !w-auto" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, page: 1 })}><option value="">All roles</option>{['admin', 'manager', 'member'].map((r) => <option key={r}>{r}</option>)}</select>
    <button className="btn ml-auto" onClick={() => setInv(true)}><UserPlus size={16} />Invite user</button></div>
    {!d ? <Skeletons n={2} /> : !d.users.length ? <Empty icon={UserPlus} title="No users match" text="Adjust the search or role filter." /> : <div className="card overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{['Name', 'Email', 'Role', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{d.users.map((u) => (<tr key={u._id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3">{name(u)}</td><td className="px-4 py-3">{u.email}</td>
        <td className="px-4 py-3"><select className="input !w-auto !py-1" disabled={u._id === me._id} value={u.role} onChange={(e) => setAsk({ user: u, body: { role: e.target.value }, msg: `Change ${name(u)} from ${u.role} to ${e.target.value}?`, label: 'Change role' })}>{['admin', 'manager', 'member'].map((r) => <option key={r}>{r}</option>)}</select></td>
        <td className="px-4 py-3">{u.active === false ? 'Deactivated' : u.emailVerified ? 'Active' : 'Unverified'}</td>
        <td className="px-4 py-3 text-right"><button className="btn-ghost" disabled={u._id === me._id} onClick={() => setAsk({ user: u, body: { active: u.active === false }, msg: `${u.active === false ? 'Reactivate' : 'Deactivate'} ${name(u)}?`, label: u.active === false ? 'Reactivate' : 'Deactivate' })}>{u.active === false ? 'Reactivate' : 'Deactivate'}</button></td></tr>))}</tbody></table></div>}
    {d && <Pager page={f.page} pages={d.pages} set={(p) => setF({ ...f, page: p })} />}
    {ask && <Confirm label={ask.label} message={ask.msg} onConfirm={apply} onCancel={() => { setAsk(null); load(); }} />}
    {inv && <Modal title="Invite user" onClose={() => setInv(false)}><form onSubmit={invite} className="space-y-3"><p className="text-sm text-slate-500">They get an email with a code to set their password.</p>
      <div className="grid grid-cols-2 gap-3">{[['firstName', 'First name'], ['lastName', 'Last name']].map(([k, l]) => <div key={k}><label className="label">{l}</label><input required className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>)}</div>
      <div><label className="label">Email</label><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{['member', 'manager', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></div>
      <div className="flex justify-end"><button className="btn">Send invitation</button></div></form></Modal>}</div>);
};
const ACTIONS = ['task.create', 'task.delete', 'task.status', 'task.assign', 'project.create', 'project.members', 'project.delete', 'user.role', 'user.active', 'user.invite', 'chat.group', 'chat.members'];
const Activity = () => {
  const ref = useRef(); const toast = useToast(); const [d, setD] = useState(null); const [f, setF] = useState({ q: '', action: '', page: 1 });
  useEffect(() => { const t = setTimeout(() => api.get('/activity', { params: f }).then((r) => setD(r.data)).catch((e) => { toast(errMsg(e), 'error'); setD({ items: [], pages: 1 }); }), 250); return () => clearTimeout(t); }, [f]); rowsIn(ref, d);
  return (<div ref={ref} className="space-y-3"><div className="flex flex-wrap gap-2"><input className="input !w-56" placeholder="Search activity" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
    <select className="input !w-auto" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value, page: 1 })}><option value="">All actions</option>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</select></div>
    {!d ? <Skeletons n={2} /> : !d.items.length ? <Empty icon={UserPlus} title="No activity found" text="Actions on tasks, projects, users and chats are recorded here." /> : <div className="card overflow-x-auto !p-0"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{['When', 'Who', 'Action', 'Details'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody>{d.items.map((a) => <tr key={a._id} className="border-t border-slate-100 dark:border-slate-800"><td className="whitespace-nowrap px-4 py-3">{new Date(a.createdAt).toLocaleString()}</td><td className="px-4 py-3">{name(a.actor)}</td><td className="px-4 py-3">{a.action}</td><td className="px-4 py-3">{a.summary}</td></tr>)}</tbody></table></div>}
    {d && <Pager page={f.page} pages={d.pages} set={(p) => setF({ ...f, page: p })} />}</div>);
};
const Admin = () => {
  const { user } = useAuth(); const tabs = user.role === 'admin' ? [['Overview', Overview], ['Users', Users], ['Activity', Activity]] : [['Activity', Activity]]; const [t, setT] = useState(0); const Tab = tabs[t][1];
  return (<div className="space-y-6"><h1 className="text-2xl font-bold">{user.role === 'admin' ? 'Admin' : 'Project activity'}</h1>
    <div className="flex gap-2">{tabs.map(([l], i) => <button key={l} onClick={() => setT(i)} className={i === t ? 'btn' : 'btn-ghost'}>{l}</button>)}</div><Tab key={t} /></div>);
};
export default Admin;
