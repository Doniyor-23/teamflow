import { useEffect, useMemo, useRef, useState } from 'react'; import { useRT } from '../socket';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Search, Trash2, MessageSquare, ListChecks, Columns3 } from 'lucide-react';
import api, { errMsg } from '../api'; import { useAuth } from '../auth';
import { Avatar, Confirm, Empty, Modal, COLS, PRIORITY, dateVal, fmt, name, useToast } from '../ui';

const Card = ({ task, onOpen, overlay }) => {
  const s = useSortable({ id: task._id });
  const style = overlay ? {} : { transform: CSS.Transform.toString(s.transform), transition: s.transition, opacity: s.isDragging ? 0.3 : 1 };
  const done = task.checklist?.filter((c) => c.done).length || 0;
  return (<div ref={overlay ? undefined : s.setNodeRef} style={style} {...(overlay ? {} : { ...s.attributes, ...s.listeners })} onClick={() => onOpen(task)}
    className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800">
    <p className="font-medium">{task.title}</p><p className="text-xs text-slate-500">{task.project?.name}</p>
    <div className="mt-2 flex items-center justify-between"><span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY[task.priority]}`}>{task.priority}</span>
      <span className="flex items-center gap-2 text-xs text-slate-500">{task.checklist?.length > 0 && <span className="flex items-center gap-1"><ListChecks size={12} />{done}/{task.checklist.length}</span>}
        <span className="flex items-center gap-1"><MessageSquare size={12} />{task.commentsCount}</span>{fmt(task.deadline)}<Avatar user={task.assignee} size={22} /></span></div></div>);
};
const Column = ({ id, label, tasks, onOpen }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (<div className="w-72 shrink-0"><h3 className="mb-2 flex justify-between px-1 text-sm font-semibold">{label}<span className="text-slate-400">{tasks.length}</span></h3>
    <div ref={setNodeRef} className={`min-h-[8rem] space-y-2 rounded-xl p-2 ${isOver ? 'bg-indigo-100/60 dark:bg-indigo-500/10' : 'bg-slate-100 dark:bg-slate-900'}`}>
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>{tasks.map((t) => <Card key={t._id} task={t} onOpen={onOpen} />)}</SortableContext></div></div>);
};
const TaskForm = ({ task, projects, users, projectId, onSaved, onDeleted, onClose }) => {
  const [f, setF] = useState({ title: task?.title || '', description: task?.description || '', project: task?.project?._id || projectId || projects[0]?._id || '', assignee: task?.assignee?._id || '',
    status: task?.status || 'todo', priority: task?.priority || 'medium', startDate: dateVal(task?.startDate), deadline: dateVal(task?.deadline), checklist: task?.checklist || [] });
  const [item, setItem] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false); const toast = useToast();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const body = { ...f, assignee: f.assignee || null, checklist: f.checklist.map(({ text, done }) => ({ text, done })) };
      const r = task ? await api.put(`/tasks/${task._id}`, body) : await api.post('/tasks', body); toast(task ? 'Task updated' : 'Task created'); onSaved(r.data.task); }
    catch (x) { toast(errMsg(x), 'error'); setBusy(false); } };
  const remove = async () => { try { await api.delete(`/tasks/${task._id}`); toast('Task deleted'); onDeleted(task._id); } catch (x) { toast(errMsg(x), 'error'); setConfirm(false); } };
  const sel = (k, opts) => <select className="input" value={f[k]} onChange={set(k)}>{opts}</select>;
  return (<Modal drawer title={task ? 'Task details' : 'New task'} onClose={onClose}><form onSubmit={save} className="space-y-3">
    <div><label className="label">Title</label><input required className="input" value={f.title} onChange={set('title')} /></div>
    <div><label className="label">Description</label><textarea rows={3} className="input" value={f.description} onChange={set('description')} /></div>
    <div className="grid grid-cols-2 gap-3">
      <div><label className="label">Project</label>{sel('project', projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>))}</div>
      <div><label className="label">Assignee</label>{sel('assignee', [<option key="" value="">Unassigned</option>, ...users.map((u) => <option key={u._id} value={u._id}>{name(u)}</option>)])}</div>
      <div><label className="label">Status</label>{sel('status', COLS.map(([v, l]) => <option key={v} value={v}>{l}</option>))}</div>
      <div><label className="label">Priority</label>{sel('priority', ['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>))}</div>
      <div><label className="label">Start</label><input type="date" className="input" value={f.startDate} onChange={set('startDate')} /></div>
      <div><label className="label">Deadline</label><input type="date" className="input" value={f.deadline} onChange={set('deadline')} /></div></div>
    <div><label className="label">Checklist</label>{f.checklist.map((c, i) => (<label key={i} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={!!c.done}
      onChange={() => setF({ ...f, checklist: f.checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })} />{c.text}</label>))}
      <div className="mt-1 flex gap-2"><input className="input" placeholder="Add item" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (item.trim()) { setF({ ...f, checklist: [...f.checklist, { text: item.trim(), done: false }] }); setItem(''); } } }} /></div></div>
    <div className="flex justify-between pt-2">{task ? <button type="button" className="btn-ghost text-red-600" onClick={() => setConfirm(true)}><Trash2 size={15} />Delete</button> : <span />}
      <button className="btn" disabled={busy || !f.project}>Save task</button></div></form>
    {confirm && <Confirm message={`Delete "${task.title}"? This cannot be undone.`} onConfirm={remove} onCancel={() => setConfirm(false)} />}</Modal>);
};
const Kanban = ({ mine }) => {
  const { user } = useAuth(); const toast = useToast(); const { socket, epoch } = useRT();
  const [tasks, setTasks] = useState(null); const [projects, setProjects] = useState([]); const [users, setUsers] = useState([]);
  const [fl, setFl] = useState({ project: '', search: '', assignee: '', priority: '', due: '' }); const [open, setOpen] = useState(null); const [drag, setDrag] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  useEffect(() => { Promise.all([api.get('/projects'), api.get('/users')]).then(([p, u]) => { setProjects(p.data.projects); setUsers(u.data.users); }).catch((e) => toast(errMsg(e), 'error')); }, []);
  const load = () => api.get('/tasks', { params: { project: fl.project || undefined, assignee: mine ? 'me' : fl.assignee || undefined, priority: fl.priority || undefined } })
    .then((r) => setTasks(r.data.tasks)).catch((e) => { toast(errMsg(e), 'error'); setTasks([]); });
  useEffect(() => { load(); }, [fl.project, fl.assignee, fl.priority, mine, epoch]);
  const flr = useRef(fl); flr.current = fl;
  useEffect(() => { if (!socket) return;
    const ok = (t) => (!mine || t.assignee?._id === user._id) && (!flr.current.project || t.project?._id === flr.current.project);
    const up = (t) => setTasks((ts) => { if (!ts) return ts; const has = ts.some((x) => x._id === t._id); if (!ok(t)) return ts.filter((x) => x._id !== t._id); return has ? ts.map((x) => (x._id === t._id ? t : x)) : [...ts, t]; });
    const del = ({ _id }) => setTasks((ts) => ts && ts.filter((x) => x._id !== _id));
    const re = (items) => setTasks((ts) => ts && ts.map((x) => { const i = items.find((y) => y.id === x._id); return i ? { ...x, status: i.status, order: i.order } : x; }));
    socket.on('task:created', up); socket.on('task:updated', up); socket.on('task:deleted', del); socket.on('task:reordered', re);
    return () => { socket.off('task:created', up); socket.off('task:updated', up); socket.off('task:deleted', del); socket.off('task:reordered', re); }; }, [socket, mine]);
  const visible = useMemo(() => (tasks || []).filter((t) => (!fl.search || t.title.toLowerCase().includes(fl.search.toLowerCase())) &&
    (!fl.due || (t.deadline && t.status !== 'done' && (fl.due === 'overdue' ? new Date(t.deadline) < new Date() : new Date(t.deadline) - new Date() < 7 * 864e5 && new Date(t.deadline) >= new Date())))), [tasks, fl.search, fl.due]);
  const col = (list, s) => list.filter((t) => t.status === s).sort((a, b) => a.order - b.order);
  const find = (id) => tasks.find((t) => t._id === id);
  const onEnd = async ({ active, over }) => {
    setDrag(null); if (!over || active.id === over.id) return;
    const t = find(active.id); const toStatus = COLS.some(([c]) => c === over.id) ? over.id : find(over.id)?.status; if (!toStatus) return;
    const src = col(tasks, t.status); let dest = toStatus === t.status ? src : col(tasks, toStatus).filter((x) => x._id !== t._id);
    const overIdx = dest.findIndex((x) => x._id === over.id);
    if (toStatus === t.status) dest = arrayMove(src, src.findIndex((x) => x._id === t._id), overIdx < 0 ? src.length - 1 : overIdx);
    else dest.splice(overIdx < 0 ? dest.length : overIdx, 0, { ...t, status: toStatus });
    const changed = dest.map((x, i) => ({ ...x, status: toStatus, order: i })); const ids = new Set(changed.map((x) => x._id));
    const srcLeft = toStatus === t.status ? [] : src.filter((x) => x._id !== t._id).map((x, i) => ({ ...x, order: i })); srcLeft.forEach((x) => ids.add(x._id));
    const prev = tasks; const all = [...changed, ...srcLeft];
    setTasks([...tasks.filter((x) => !ids.has(x._id)), ...all]);
    try { await api.patch('/tasks/reorder', { items: all.map((x) => ({ id: x._id, status: x.status, order: x.order })) }); }
    catch (e) { setTasks(prev); toast(`Move failed and was reverted. ${errMsg(e)}`, 'error'); }
  };
  const saved = (nt) => { setOpen(null); setTasks((ts) => (ts.some((x) => x._id === nt._id) ? ts.map((x) => (x._id === nt._id ? nt : x)) : [...ts, nt])); };
  const fset = (k) => (e) => setFl({ ...fl, [k]: e.target.value });
  return (<div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{mine ? 'My Tasks' : 'Kanban Board'}</h1>
    <button className="btn" disabled={!projects.length || user.role === 'member'} title={user.role === 'member' ? 'Only managers and admins create tasks' : undefined} onClick={() => setOpen({})}><Plus size={16} />New task</button></div>
    <div className="flex flex-wrap gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className="input !pl-8" placeholder="Search tasks" value={fl.search} onChange={fset('search')} /></div>
      <select className="input !w-auto" value={fl.project} onChange={fset('project')}><option value="">All projects</option>{projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
      {!mine && <select className="input !w-auto" value={fl.assignee} onChange={fset('assignee')}><option value="">Anyone</option>{users.map((u) => <option key={u._id} value={u._id}>{name(u)}</option>)}</select>}
      <select className="input !w-auto" value={fl.priority} onChange={fset('priority')}><option value="">Any priority</option>{['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}</select>
      <select className="input !w-auto" value={fl.due} onChange={fset('due')}><option value="">Any deadline</option><option value="overdue">Overdue</option><option value="week">Due this week</option></select></div>
    {!tasks ? <div className="skeleton h-64" /> : !projects.length ? <Empty icon={Columns3} title="Create a project first" text="Tasks belong to a project. Add one on the Projects page." /> :
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setDrag(find(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDrag(null)}>
        <div className="flex gap-4 overflow-x-auto pb-4">{COLS.map(([id, label]) => <Column key={id} id={id} label={label} tasks={col(visible, id)} onOpen={setOpen} />)}</div>
        <DragOverlay>{drag && <Card task={drag} overlay onOpen={() => {}} />}</DragOverlay></DndContext>}
    {open && <TaskForm task={open._id ? open : null} projects={projects} users={users} projectId={fl.project} onClose={() => setOpen(null)} onSaved={saved}
      onDeleted={(id) => { setOpen(null); setTasks((ts) => ts.filter((x) => x._id !== id)); }} />}</div>);
};
export default Kanban;
