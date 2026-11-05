import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { User } from './models.js';
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const auth = wrap(async (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  let id; try { id = jwt.verify(t, process.env.JWT_SECRET).id; } catch { return res.status(401).json({ message: 'Please sign in again.' }); }
  req.user = await User.findById(id);
  if (!req.user || req.user.active === false) return res.status(401).json({ message: 'Account not found.' });
  next();
});
export const notFound = (req, res) => res.status(404).json({ message: 'Route not found.' });
export const errorHandler = (e, req, res, next) => {
  if (e instanceof ZodError) return res.status(400).json({ message: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (e.code === 11000) return res.status(409).json({ message: 'That email is already registered.' });
  if (e.name === 'CastError') return res.status(400).json({ message: 'Invalid id.' });
  console.error(e); res.status(e.status || 500).json({ message: e.status ? e.message : 'Something went wrong on the server.', needsVerification: e.needsVerification });
};
export const role = (...r) => (req, res, next) => (r.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do that.' }));
