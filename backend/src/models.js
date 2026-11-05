import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
const opts = { timestamps: true };
export const User = model('User', new Schema({
  firstName: { type: String, required: true, trim: true }, lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true, select: false },
  phone: String, jobTitle: String, department: String, avatar: String,
  role: { type: String, enum: ['member', 'manager', 'admin'], default: 'member' }, emailVerified: { type: Boolean, default: false }, active: { type: Boolean, default: true },
  codeHash: { type: String, select: false }, codeExpires: Date, codeAttempts: { type: Number, default: 0 }, codeSentAt: Date, codePurpose: String,
}, opts));
export const Project = model('Project', new Schema({
  name: { type: String, required: true, trim: true }, description: String, owner: ref('User'), members: [ref('User')],
  startDate: Date, deadline: Date, status: { type: String, enum: ['planning', 'active', 'on_hold', 'completed'], default: 'active' },
}, opts));
const taskSchema = new Schema({
  title: { type: String, required: true, trim: true }, description: String, project: { ...ref('Project'), required: true },
  assignee: ref('User'), assignees: [ref('User')], creator: ref('User'),
  status: { type: String, enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  startDate: Date, deadline: Date, order: { type: Number, default: 0 }, commentsCount: { type: Number, default: 0 },
  checklist: [{ text: String, done: { type: Boolean, default: false } }],
}, opts);
taskSchema.index({ project: 1, status: 1, order: 1 }); taskSchema.index({ assignee: 1, deadline: 1 }); taskSchema.index({ assignees: 1 });
export const Task = model('Task', taskSchema);
export const Notification = model('Notification', (() => { const s = new Schema({ user: { ...ref('User'), index: true }, type: String, message: String, link: String, read: { type: Boolean, default: false }, key: String }, opts);
  s.index({ user: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } }); return s; })());
export const Activity = model('Activity', new Schema({ actor: ref('User'), action: { type: String, index: true }, entityType: String, entityId: Schema.Types.ObjectId, summary: String, project: { ...ref('Project'), index: true } }, { timestamps: { createdAt: true, updatedAt: false } }));
export const Conversation = model('Conversation', new Schema({ type: { type: String, enum: ['direct', 'group'] }, key: { type: String, unique: true, sparse: true }, name: String, description: String, avatar: String,
  members: [{ ...ref('User'), index: true }], admins: [ref('User')], createdBy: ref('User'), lastMessageAt: { type: Date, default: Date.now } }, opts));
const msg = new Schema({ conversation: { ...ref('Conversation'), index: true }, sender: ref('User'), text: String, readBy: [ref('User')], editedAt: Date, deleted: { type: Boolean, default: false } }, opts);
msg.index({ conversation: 1, createdAt: -1 });
export const Message = model('Message', msg);
