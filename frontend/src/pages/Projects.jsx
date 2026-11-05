import { useEffect, useState } from 'react';
import { FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../auth'; import api, { errMsg } from '../api'; import { Modal, Confirm, Empty, Skeletons, fmt, dateVal, name, useToast } from '../ui';
const ProjectForm = ({ project, users, onSaved, onClose }) => {
  const [f, setF] = useState({ name: project?.name || '', description: project?.description || '', startDate: dateVal(project?.startDate), deadline: dateVal(project?.deadline),
    status: project?.status || 'active', members: (project?.members || []).map((m) => m._id || m) }); const [busy, setBusy] = useState(false); const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); setBusy(true);
    try { const r = project ? await api.put(`/projects/${project._id}`, f) : await api.post('/projects', f); toast(project ? 'Project updated' : 'Project created'); onSaved(r.data.project); }
    catch (x) { toast(errMsg(x), 'error'); setBusy(false); } };
  return (<Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}><form onSubmit={submit} className="space-y-3">
    <div><label className="label">Name</label><input required className="input" value={f.name} onChange={set('name')} /></div>
    <div><label className="label">Description</label><textarea className="input" rows={3} value={f.description} onChange={set('description')} /></div>
    <div className="grid grid-cols-3 gap-3"><div><label className="label">Start</label><input type="date" className="input" value={f.startDate} onChange={set('startDate')} /></div>
      <div><label className="label">Deadline</label><input type="date" className="input" value={f.deadline} onChange={set('deadline')} /></div>
      <div><label className="label">Status</label><select className="input" value={f.status} onChange={set('status')}>{['planning', 'active', 'on_hold', 'completed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div></div>
    <div><label className="label">Members</label><select multiple className="input h-28" value={f.members} onChange={(e) => setF({ ...f, members: [...e.target.selectedOptions].map((o) => o.value) })}>
      {users.map((u) => <option key={u._id} value={u._id}>{name(u)}</option>)}</select></div>
    <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save project</button></div></form></Modal>);
};
const Projects = () => {
  const { user } = useAuth(); const [list, setList] = useState(null); const [users, setUsers] = useState([]); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const toast = useToast();
  const load = () => api.get('/projects').then((r) => setList(r.data.projects)).catch((e) => { toast(errMsg(e), 'error'); setList([]); });
  useEffect(() => { load(); api.get('/users').then((r) => setUsers(r.data.users)).catch(() => {}); }, []);
  const remove = async () => { try { await api.delete(`/projects/${del._id}`); toast('Project deleted'); setDel(null); load(); } catch (e) { toast(errMsg(e), 'error'); } };
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Projects</h1>{user.role !== 'member' && <button className="btn" onClick={() => setEdit({})}><Plus size={16} />New project</button>}</div>
    {!list ? <Skeletons h="h-40" /> : !list.length ? <Empty icon={FolderKanban} title="No projects yet" text="Create a project to start organizing tasks on the board." action={user.role !== 'member' ? <button className="btn" onClick={() => setEdit({})}>Create project</button> : null} /> :
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => (<div key={p._id} className="card">
        <div className="flex items-start justify-between"><h3 className="font-semibold">{p.name}</h3>{user.role !== 'member' && <div className="flex gap-1"><button aria-label="Edit" onClick={() => setEdit(p)}><Pencil size={15} /></button><button aria-label="Delete" onClick={() => setDel(p)}><Trash2 size={15} /></button></div>}</div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
        <div className="mt-4 h-2 rounded bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded bg-indigo-500" style={{ width: `${p.progress}%` }} /></div>
        <p className="mt-2 flex justify-between text-xs text-slate-500"><span>{p.progress}% · {p.taskCount} tasks · {p.status.replace('_', ' ')}</span><span>Due {fmt(p.deadline)}</span></p></div>))}</div>}
    {edit && <ProjectForm project={edit._id ? edit : null} users={users} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    {del && <Confirm message={`Delete "${del.name}" and all of its tasks? This cannot be undone.`} onConfirm={remove} onCancel={() => setDel(null)} />}</div>);
};
export default Projects;
