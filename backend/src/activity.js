import { Activity, Project } from './models.js'; import { esc } from './util.js';
export const log = (actor, action, entityType, entityId, summary, project) =>
  Activity.create({ actor: actor._id || actor, action, entityType, entityId, summary, project }).catch(() => {});
export const listActivity = async (req, res) => {
  const { q, action, page = 1 } = req.query; const f = {};
  if (req.user.role === 'manager') f.project = { $in: (await Project.find({ $or: [{ members: req.user._id }, { owner: req.user._id }] }).select('_id')).map((p) => p._id) };
  if (action) f.action = String(action); if (q) f.summary = { $regex: esc(q), $options: 'i' };
  const [items, total] = await Promise.all([Activity.find(f).sort('-createdAt').skip((+page - 1) * 20).limit(20).populate('actor', 'firstName lastName'), Activity.countDocuments(f)]);
  res.json({ items, total, pages: Math.ceil(total / 20) });
};
