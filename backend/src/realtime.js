import { Server } from 'socket.io'; import jwt from 'jsonwebtoken';
import { User, Project, Conversation } from './models.js';
let io; const online = new Map();
export const emit = (room, ev, payload) => io?.to(room).emit(ev, payload);
export const joinConv = (c) => c.members.forEach((m) => io?.in(`user:${m._id || m}`).socketsJoin(`conv:${c._id}`));
export const leaveConv = (cid, users) => users.forEach((u) => io?.in(`user:${u}`).socketsLeave(`conv:${cid}`));
export const syncProject = (pid, add, rem) => { io?.in('role:admin').socketsJoin(`project:${pid}`);
  add.forEach((u) => io?.in(`user:${u}`).socketsJoin(`project:${pid}`)); rem.forEach((u) => io?.in(`user:${u}`).socketsLeave(`project:${pid}`)); };
export const kick = (uid) => io?.in(`user:${uid}`).disconnectSockets(true);
export const initSocket = (server) => {
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  io = new Server(server, { cors: { origin: allowedOrigins.length ? allowedOrigins : true, credentials: true } });
  io.use(async (s, next) => { try { const { id } = jwt.verify(s.handshake.auth.token, process.env.JWT_SECRET); const u = await User.findById(id);
    if (!u || u.active === false || !u.emailVerified) throw new Error(); s.user = u; next(); } catch { next(new Error('unauthorized')); } });
  io.on('connection', async (s) => {
    const u = s.user; const id = String(u._id);
    s.on('typing', ({ conversationId }) => { if (s.rooms.has(`conv:${conversationId}`)) s.to(`conv:${conversationId}`).emit('chat:typing', { conversationId, userId: id, name: u.firstName }); });
    s.on('disconnect', () => { const n = (online.get(id) || 1) - 1; if (n <= 0) { online.delete(id); io.emit('presence', { userId: id, online: false }); } else online.set(id, n); });
    s.join([`user:${id}`, `role:${u.role}`]);
    const [ps, cs] = await Promise.all([Project.find(u.role === 'admin' ? {} : { $or: [{ members: u._id }, { owner: u._id }] }).select('_id'), Conversation.find({ members: u._id }).select('_id')]);
    s.join([...ps.map((p) => `project:${p._id}`), ...cs.map((c) => `conv:${c._id}`)]);
    online.set(id, (online.get(id) || 0) + 1); io.emit('presence', { userId: id, online: true }); s.emit('presence:list', [...online.keys()]);
  });
};
