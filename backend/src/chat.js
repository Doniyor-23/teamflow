import { z } from 'zod';
import { Conversation, Message, User } from './models.js'; import { emit, joinConv, leaveConv } from './realtime.js'; import { log } from './activity.js'; import { E, esc } from './util.js';
const pop = (q) => q.populate('members', 'firstName lastName avatar jobTitle');
const mine = async (u, id) => { const c = await Conversation.findOne({ _id: id, members: u._id }); if (!c) throw E(404, 'Conversation not found.'); return c; };
const canAdmin = (u, c) => u.role === 'admin' || c.admins.some((a) => String(a) === String(u._id));
const announce = async (c) => { const full = await pop(Conversation.findById(c._id)).lean(); c.members.forEach((m) => emit(`user:${m}`, 'chat:conversation', { ...full, unread: 0 })); return full; };
export const list = async (req, res) => {
  const convs = await pop(Conversation.find({ members: req.user._id }).sort('-lastMessageAt')).lean();
  const out = await Promise.all(convs.map(async (c) => { const [last, unread] = await Promise.all([Message.findOne({ conversation: c._id }).sort('-createdAt').lean(),
    Message.countDocuments({ conversation: c._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id }, deleted: false })]); return { ...c, last, unread }; }));
  res.json({ conversations: out });
};
export const direct = async (req, res) => {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  const other = await User.findOne({ _id: userId, active: { $ne: false } });
  if (!other || String(other._id) === String(req.user._id)) throw E(400, 'Choose another active team member.');
  const key = [String(req.user._id), userId].sort().join(':'); let c = await Conversation.findOne({ key });
  if (!c) { c = await Conversation.create({ type: 'direct', key, members: [req.user._id, other._id], createdBy: req.user._id }); joinConv(c); await announce(c); }
  res.status(201).json({ conversation: { ...(await pop(Conversation.findById(c._id)).lean()), unread: 0 } });
};
const groupSchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().max(300).optional(), avatar: z.string().url().optional().or(z.literal('')), members: z.array(z.string()) });
export const createGroup = async (req, res) => {
  const d = groupSchema.parse(req.body); const members = [...new Set([String(req.user._id), ...d.members])];
  if ((await User.countDocuments({ _id: { $in: members }, active: { $ne: false } })) !== members.length) throw E(400, 'Some selected users are not available.');
  const c = await Conversation.create({ ...d, type: 'group', members, admins: [req.user._id], createdBy: req.user._id, lastMessageAt: new Date() });
  joinConv(c); await announce(c); await log(req.user, 'chat.group', 'conversation', c._id, `Created chat group "${c.name}"`); res.status(201).json({ conversation: { ...(await pop(Conversation.findById(c._id)).lean()), unread: 0 } });
};
export const updateGroup = async (req, res) => {
  const c = await mine(req.user, req.params.id); if (c.type !== 'group' || !canAdmin(req.user, c)) throw E(403, 'Only group admins can change this group.');
  const d = groupSchema.parse(req.body); const old = c.members.map(String); const members = [...new Set([...c.admins.map(String), ...d.members])];
  if ((await User.countDocuments({ _id: { $in: members }, active: { $ne: false } })) !== members.length) throw E(400, 'Some selected users are not available.');
  Object.assign(c, { name: d.name, description: d.description, avatar: d.avatar, members }); await c.save();
  leaveConv(c._id, old.filter((x) => !members.includes(x))); joinConv(c);
  if (old.join() !== members.join()) await log(req.user, 'chat.members', 'conversation', c._id, `Changed members of chat group "${c.name}"`);
  const full = await announce(c); old.filter((x) => !members.includes(x)).forEach((u) => emit(`user:${u}`, 'chat:removed', { _id: String(c._id) })); res.json({ conversation: full });
};
export const messages = async (req, res) => {
  const c = await mine(req.user, req.params.id); const { q } = req.query;
  const f = { conversation: c._id, ...(q ? { text: { $regex: esc(q), $options: 'i' }, deleted: false } : {}) };
  res.json({ messages: (await Message.find(f).sort('-createdAt').limit(100).populate('sender', 'firstName lastName avatar').lean()).reverse() });
};
export const send = async (req, res) => {
  const c = await mine(req.user, req.params.id); const { text } = z.object({ text: z.string().trim().min(1).max(4000) }).parse(req.body);
  const m = await Message.create({ conversation: c._id, sender: req.user._id, text, readBy: [req.user._id] }); c.lastMessageAt = new Date(); await c.save();
  const full = await Message.findById(m._id).populate('sender', 'firstName lastName avatar').lean(); emit(`conv:${c._id}`, 'chat:message', full); res.status(201).json({ message: full });
};
const ownMsg = async (req, adminOk) => {
  const m = await Message.findById(req.params.id); if (!m || m.deleted) throw E(404, 'Message not found.'); const c = await mine(req.user, m.conversation);
  if (String(m.sender) !== String(req.user._id) && !(adminOk && canAdmin(req.user, c))) throw E(403, 'You can only change your own messages.'); return m;
};
const push = async (m) => { const full = await Message.findById(m._id).populate('sender', 'firstName lastName avatar').lean(); emit(`conv:${m.conversation}`, 'chat:message:updated', full); return full; };
export const edit = async (req, res) => { const m = await ownMsg(req); m.text = z.object({ text: z.string().trim().min(1).max(4000) }).parse(req.body).text; m.editedAt = new Date(); await m.save(); res.json({ message: await push(m) }); };
export const remove = async (req, res) => { const m = await ownMsg(req, true); m.deleted = true; m.text = ''; await m.save(); res.json({ message: await push(m) }); };
export const read = async (req, res) => {
  const c = await mine(req.user, req.params.id); await Message.updateMany({ conversation: c._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  emit(`conv:${c._id}`, 'chat:read', { conversationId: String(c._id), userId: String(req.user._id) }); res.json({ ok: true });
};
