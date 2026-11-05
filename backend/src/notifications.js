import { Notification, Task } from './models.js'; import { emit } from './realtime.js';
export const notify = async (user, type, message, link = '/', key) => {
  try { const n = await Notification.create({ user, type, message, link, key }); emit(`user:${user}`, 'notification', n); return n; } catch (e) { if (e.code !== 11000) throw e; }
};
export const listNotifications = async (req, res) => {
  const [notifications, unread] = await Promise.all([Notification.find({ user: req.user._id }).sort('-createdAt').limit(100), Notification.countDocuments({ user: req.user._id, read: false })]);
  res.json({ notifications, unread });
};
export const readNotification = async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true }); res.json({ ok: true }); };
export const readAll = async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); };
export const deadlineScan = async () => {
  const now = new Date(); const base = { status: { $ne: 'done' }, $or: [{ assignee: { $ne: null } }, { 'assignees.0': { $exists: true } }] };
  const soon = await Task.find({ ...base, deadline: { $gte: now, $lte: new Date(Date.now() + 864e5) } }).select('title assignee assignees');
  for (const t of soon) {
    const list = t.assignees?.length ? t.assignees : (t.assignee ? [t.assignee] : []);
    for (const a of list) await notify(a, 'deadline', `"${t.title}" is due within 24 hours`, '/my-tasks', `due:${t._id}:${a}`);
  }
  const late = await Task.find({ ...base, deadline: { $lt: now } }).select('title assignee assignees');
  for (const t of late) {
    const list = t.assignees?.length ? t.assignees : (t.assignee ? [t.assignee] : []);
    for (const a of list) await notify(a, 'overdue', `"${t.title}" is overdue`, '/my-tasks', `late:${t._id}:${a}`);
  }
};
