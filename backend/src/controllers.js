import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import { z } from 'zod';
import { User, Project, Task } from './models.js'; import { sendCode, checkCode } from './mailer.js'; import { emit, syncProject } from './realtime.js'; import { notify } from './notifications.js'; import { log } from './activity.js';
const need = (u, ...r) => { if (!r.includes(u.role)) throw httpErr(403, 'You do not have permission to do that.'); };
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => { const o = u.toObject(); delete o.password; delete o.codeHash; return o; };
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const str = z.string().trim().min(1);
const STATUS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const regSchema = z.object({ firstName: str, lastName: str, email: z.string().trim().email().toLowerCase(), password: z.string().min(8),
  phone: str, jobTitle: str, department: str, avatar: z.string().url().optional().or(z.literal('')) });
export const register = async (req, res) => {
  const d = regSchema.parse(req.body); // role is never read from input
  let u = await User.findOne({ email: d.email }); if (u?.emailVerified) throw httpErr(409, 'That email is already registered.');
  const password = await bcrypt.hash(d.password, 12);
  if (u) Object.assign(u, d, { password }); else u = new User({ ...d, password });
  await sendCode(u, 'verify'); res.status(201).json({ needsVerification: true, email: u.email });
};
export const login = async (req, res) => {
  const { email, password } = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) throw httpErr(401, 'Incorrect email or password.');
  if (user.active === false) throw httpErr(403, 'This account has been deactivated. Contact an administrator.');
  if (!user.emailVerified) throw Object.assign(httpErr(403, 'Verify your email before signing in.'), { needsVerification: true });
  res.json({ token: sign(user), user: pub(user) });
};
const em = z.string().email().toLowerCase();
export const verifyEmail = async (req, res) => {
  const { email, code } = z.object({ email: em, code: z.string().length(6) }).parse(req.body);
  const u = await User.findOne({ email }).select('+codeHash'); await checkCode(u, code, 'verify'); u.emailVerified = true; await u.save(); res.json({ token: sign(u), user: pub(u) });
};
export const resend = async (req, res) => { const u = await User.findOne({ email: em.parse(req.body.email) }); if (u && !u.emailVerified) await sendCode(u, 'verify'); res.json({ ok: true }); };
export const forgot = async (req, res) => { const u = await User.findOne({ email: em.parse(req.body.email) }); if (u && u.active !== false) await sendCode(u, 'reset'); res.json({ ok: true }); };
export const reset = async (req, res) => {
  const { email, code, password } = z.object({ email: em, code: z.string().length(6), password: z.string().min(8) }).parse(req.body);
  const u = await User.findOne({ email }).select('+codeHash +password'); await checkCode(u, code, 'reset'); u.password = await bcrypt.hash(password, 12); u.emailVerified = true; await u.save(); res.json({ ok: true });
};
export const me = (req, res) => res.json({ user: req.user });
export const listUsers = async (req, res) => res.json({ users: await User.find({ active: { $ne: false } }).sort('firstName').select('-codeExpires -codeAttempts -codeSentAt -codePurpose') });

const access = (u) => (u.role === 'admin' ? {} : { $or: [{ members: u._id }, { owner: u._id }] });
const projectIds = async (u) => (await Project.find(access(u)).select('_id')).map((p) => p._id);
const projSchema = z.object({ name: str, description: z.string().optional(), members: z.array(z.string()).default([]),
  startDate: z.string().optional().nullable(), deadline: z.string().optional().nullable(), status: z.enum(['planning', 'active', 'on_hold', 'completed']).optional() });
const clean = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
export const listProjects = async (req, res) => {
  const projects = await Project.find(access(req.user)).populate('members', 'firstName lastName').sort('-createdAt').lean();
  const tasks = await Task.find({ project: { $in: projects.map((p) => p._id) } }).select('project status').lean();
  projects.forEach((p) => { const t = tasks.filter((x) => String(x.project) === String(p._id)); p.taskCount = t.length;
    p.progress = t.length ? Math.round((t.filter((x) => x.status === 'done').length / t.length) * 100) : 0; });
  res.json({ projects });
};
export const createProject = async (req, res) => {
  need(req.user, 'admin', 'manager'); const d = clean(projSchema.parse(req.body)); const members = [...new Set([String(req.user._id), ...d.members])];
  const p = await Project.create({ ...d, owner: req.user._id, members }); syncProject(p._id, members, []);
  await log(req.user, 'project.create', 'project', p._id, `Created project "${p.name}"`, p._id);
  await Promise.all(members.filter((m) => m !== String(req.user._id)).map((m) => notify(m, 'project_invite', `You were added to "${p.name}"`, '/kanban')));
  res.status(201).json({ project: p });
};
export const updateProject = async (req, res) => {
  need(req.user, 'admin', 'manager'); const d = clean(projSchema.partial().parse(req.body));
  const before = await Project.findOne({ _id: req.params.id, ...access(req.user) }); if (!before) throw httpErr(404, 'Project not found.');
  const old = before.members.map(String); const p = await Project.findByIdAndUpdate(before._id, d, { new: true }); const now = p.members.map(String);
  const added = now.filter((x) => !old.includes(x)); syncProject(p._id, added, old.filter((x) => !now.includes(x)));
  if (added.length || now.length !== old.length) await log(req.user, 'project.members', 'project', p._id, `Changed members of "${p.name}"`, p._id);
  await Promise.all(added.filter((m) => m !== String(req.user._id)).map((m) => notify(m, 'project_invite', `You were added to "${p.name}"`, '/kanban')));
  res.json({ project: p });
};
export const deleteProject = async (req, res) => {
  need(req.user, 'admin', 'manager'); const p = await Project.findOneAndDelete({ _id: req.params.id, ...access(req.user) });
  if (!p) throw httpErr(404, 'Project not found.'); await Task.deleteMany({ project: p._id }); await log(req.user, 'project.delete', 'project', p._id, `Deleted project "${p.name}"`); res.json({ ok: true });
};

const taskSchema = z.object({ title: str, description: z.string().optional(), project: z.string(), assignee: z.string().optional().nullable(),
  assignees: z.array(z.string()).optional(),
  status: z.enum(STATUS).optional(), priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate: z.string().optional().nullable(), deadline: z.string().optional().nullable(),
  checklist: z.array(z.object({ text: z.string(), done: z.boolean().optional() })).optional() });
const pop = (q) => q.populate('assignee', 'firstName lastName avatar').populate('assignees', 'firstName lastName avatar').populate('project', 'name');
export const listTasks = async (req, res) => {
  const { project, assignee, status, priority, search, page = 1, limit = 200 } = req.query;
  const ids = await projectIds(req.user); const q = { project: { $in: ids } };
  if (project) q.project = ids.find((i) => String(i) === project) || null;
  if (assignee) {
    const target = assignee === 'me' ? req.user._id : assignee;
    q.$or = [{ assignee: target }, { assignees: target }];
  }
  if (status) q.status = status; if (priority) q.priority = priority;
  if (search) q.title = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const lim = Math.min(+limit || 200, 500);
  const [tasks, total] = await Promise.all([pop(Task.find(q).sort('status order').skip((page - 1) * lim).limit(lim)), Task.countDocuments(q)]);
  res.json({ tasks, total, page: +page, pages: Math.ceil(total / lim) });
};
const assignNotify = async (actor, t, prevList = []) => {
  const currentList = (t.assignees?.length ? t.assignees : (t.assignee ? [t.assignee] : [])).map((a) => String(a._id || a));
  const prevStrings = prevList.map(String);
  const newlyAssigned = currentList.filter((a) => a !== String(actor._id) && !prevStrings.includes(a));
  await Promise.all(newlyAssigned.map((uid) => notify(uid, 'assignment', `${actor.firstName} assigned you "${t.title}"`, '/my-tasks')));
};
export const createTask = async (req, res) => {
  need(req.user, 'admin', 'manager'); const d = clean(taskSchema.parse(req.body));
  if (!(await projectIds(req.user)).some((i) => String(i) === d.project)) throw httpErr(403, 'You are not a member of that project.');
  if (d.assignees && !d.assignee && d.assignees.length) d.assignee = d.assignees[0];
  if (d.assignee && (!d.assignees || !d.assignees.length)) d.assignees = [d.assignee];
  const last = await Task.findOne({ project: d.project, status: d.status || 'todo' }).sort('-order');
  const t = await Task.create({ ...d, creator: req.user._id, order: last ? last.order + 1 : 0 }); const task = await pop(Task.findById(t._id));
  emit(`project:${d.project}`, 'task:created', task); await assignNotify(req.user, task, []); await log(req.user, 'task.create', 'task', t._id, `Created task "${t.title}"`, d.project);
  res.status(201).json({ task });
};
export const updateTask = async (req, res) => {
  const ids = await projectIds(req.user); const old = await Task.findOne({ _id: req.params.id, project: { $in: ids } }); if (!old) throw httpErr(404, 'Task not found.');
  let d = clean(taskSchema.partial().parse(req.body));
  const oldAssignees = (old.assignees?.length ? old.assignees : (old.assignee ? [old.assignee] : [])).map((a) => String(a._id || a));
  if (req.user.role === 'member') {
    if (!oldAssignees.includes(String(req.user._id))) throw httpErr(403, 'Members can only update tasks assigned to them.');
    d = Object.fromEntries(Object.entries(d).filter(([k]) => ['status', 'description', 'checklist'].includes(k)));
  } else if (d.project && !ids.some((i) => String(i) === d.project)) throw httpErr(403, 'You are not a member of that project.');
  if (d.assignees !== undefined) { d.assignee = d.assignees[0] || null; }
  else if (d.assignee !== undefined) { d.assignees = d.assignee ? [d.assignee] : []; }
  const prevStatus = old.status; Object.assign(old, d); await old.save();
  const t = await pop(Task.findById(old._id)); emit(`project:${t.project._id}`, 'task:updated', t);
  if (d.assignees !== undefined || d.assignee !== undefined) {
    await assignNotify(req.user, t, oldAssignees);
    await log(req.user, 'task.assign', 'task', t._id, `Updated assignees for "${t.title}"`, t.project._id);
  }
  if (d.status && d.status !== prevStatus) await log(req.user, 'task.status', 'task', t._id, `Moved "${t.title}" to ${d.status.replace('_', ' ')}`, t.project._id);
  res.json({ task: t });
};
export const deleteTask = async (req, res) => {
  need(req.user, 'admin', 'manager'); const t = await Task.findOneAndDelete({ _id: req.params.id, project: { $in: await projectIds(req.user) } });
  if (!t) throw httpErr(404, 'Task not found.'); emit(`project:${t.project}`, 'task:deleted', { _id: String(t._id) }); await log(req.user, 'task.delete', 'task', t._id, `Deleted task "${t.title}"`, t.project); res.json({ ok: true });
};
export const reorderTasks = async (req, res) => {
  const { items } = z.object({ items: z.array(z.object({ id: z.string(), status: z.enum(STATUS), order: z.number() })).max(500) }).parse(req.body);
  const found = await Task.find({ _id: { $in: items.map((i) => i.id) }, project: { $in: await projectIds(req.user) } }).select('project assignee assignees status title');
  if (found.length !== items.length) throw httpErr(403, 'Some tasks are not available to you.');
  if (req.user.role === 'member' && found.some((t) => {
    const list = (t.assignees?.length ? t.assignees : (t.assignee ? [t.assignee] : [])).map(String);
    return !list.includes(String(req.user._id));
  })) throw httpErr(403, 'Members can only move tasks assigned to them.');
  await Task.bulkWrite(items.map((i) => ({ updateOne: { filter: { _id: i.id }, update: { status: i.status, order: i.order } } })));
  const by = Object.fromEntries(found.map((t) => [String(t._id), t])); const groups = {};
  items.forEach((i) => { (groups[by[i.id].project] ||= []).push(i); }); Object.entries(groups).forEach(([pid, list]) => emit(`project:${pid}`, 'task:reordered', list));
  for (const i of items) { const t = by[i.id]; if (t.status !== i.status) await log(req.user, 'task.status', 'task', t._id, `Moved "${t.title}" to ${i.status.replace('_', ' ')}`, t.project); }
  res.json({ modified: items.length });
};
export const dashboard = async (req, res) => {
  const ids = await projectIds(req.user); const tasks = await pop(Task.find({ project: { $in: ids } }).sort('-updatedAt')).lean();
  const now = new Date(); const open = (t) => t.status !== 'done';
  const priority = ['low', 'medium', 'high', 'urgent'].map((name) => ({ name, value: tasks.filter((t) => t.priority === name).length }));
  res.json({ total: tasks.length, completed: tasks.filter((t) => t.status === 'done').length, inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter((t) => open(t) && t.deadline && new Date(t.deadline) < now).length, priority, recent: tasks.slice(0, 6),
    upcoming: tasks.filter((t) => open(t) && t.deadline && new Date(t.deadline) >= now).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6) });
};
