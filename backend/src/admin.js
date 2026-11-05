import bcrypt from 'bcryptjs'; import crypto from 'crypto'; import { z } from 'zod';
import { User, Project, Task, Conversation } from './models.js'; import { sendCode } from './mailer.js'; import { kick } from './realtime.js'; import { log } from './activity.js'; import { E, esc } from './util.js';
const HIDE = '-codeExpires -codeAttempts -codeSentAt -codePurpose';
export const users = async (req, res) => {
  const { search, role, page = 1 } = req.query; const f = {}; if (role) f.role = String(role);
  if (search) { const r = { $regex: esc(search), $options: 'i' }; f.$or = [{ firstName: r }, { lastName: r }, { email: r }]; }
  const [list, total] = await Promise.all([User.find(f).sort('-createdAt').skip((+page - 1) * 10).limit(10).select(HIDE), User.countDocuments(f)]);
  res.json({ users: list, total, pages: Math.ceil(total / 10) });
};
export const updateUser = async (req, res) => {
  const d = z.object({ role: z.enum(['admin', 'manager', 'member']).optional(), active: z.boolean().optional() }).parse(req.body);
  if (String(req.params.id) === String(req.user._id)) throw E(400, 'You cannot change your own role or status.');
  const u = await User.findById(req.params.id); if (!u) throw E(404, 'User not found.');
  if (d.role && d.role !== u.role) { await log(req.user, 'user.role', 'user', u._id, `Changed ${u.email} from ${u.role} to ${d.role}`); u.role = d.role; }
  if (d.active !== undefined && d.active !== u.active) { await log(req.user, 'user.active', 'user', u._id, `${d.active ? 'Reactivated' : 'Deactivated'} ${u.email}`); u.active = d.active; if (!d.active) kick(u._id); }
  await u.save(); res.json({ user: await User.findById(u._id).select(HIDE) });
};
export const invite = async (req, res) => {
  const str = z.string().trim().min(1);
  const d = z.object({ firstName: str, lastName: str, email: z.string().trim().email().toLowerCase(), role: z.enum(['admin', 'manager', 'member']) }).parse(req.body);
  if (await User.exists({ email: d.email })) throw E(409, 'That email is already registered.');
  const u = new User({ ...d, password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12), emailVerified: true });
  await u.save();
  try { await sendCode(u, 'reset', true); } catch (e) { await User.deleteOne({ _id: u._id }); throw e; }
  await log(req.user, 'user.invite', 'user', u._id, `Invited ${d.email} as ${d.role}`); res.status(201).json({ user: await User.findById(u._id).select(HIDE) });
};
export const stats = async (req, res) => {
  const [users, active, projects, tasks, done, overdue, groups] = await Promise.all([User.countDocuments(), User.countDocuments({ active: { $ne: false } }), Project.countDocuments(), Task.countDocuments(),
    Task.countDocuments({ status: 'done' }), Task.countDocuments({ status: { $ne: 'done' }, deadline: { $lt: new Date() } }), Conversation.countDocuments({ type: 'group' })]);
  res.json({ users, active, projects, tasks, done, overdue, groups });
};
