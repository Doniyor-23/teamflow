import 'dotenv/config';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

import routes from './routes.js';
import { notFound, errorHandler } from './middleware.js';
import { initSocket } from './realtime.js';
import { deadlineScan } from './notifications.js';
import { User } from './models.js';

if (!process.env.JWT_SECRET) {
  console.error('Set JWT_SECRET in backend/.env');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
initSocket(server);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  }),
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        cb(null, true);
      } else {
        cb(null, true);
      }
    },
    credentials: true
  }),
  express.json({ limit: '1mb' })
);

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300 }), routes);
app.use(notFound, errorHandler);

const ensureAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
  const adminPw = process.env.ADMIN_PASSWORD || 'Admin1234';
  const hashedPassword = await bcrypt.hash(adminPw, 12);
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    existing.role = 'admin';
    existing.emailVerified = true;
    existing.active = true;
    existing.password = hashedPassword;
    await existing.save();
    console.log(`Default admin account updated: ${adminEmail}`);
  } else {
    await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      active: true,
      jobTitle: 'Administrator',
      department: 'Management',
      phone: '+998901234567'
    });
    console.log(`Default admin account created: ${adminEmail}`);
  }
};

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teamflow')
  .then(async () => {
    server.listen(process.env.PORT || 5000, () => console.log(`TeamFlow API ready on port ${process.env.PORT || 5000}`));
    await ensureAdmin().catch((e) => console.error('Failed to ensure default admin:', e.message));
    const scan = () => deadlineScan().catch((e) => console.error('Deadline scan failed:', e.message));
    scan();
    setInterval(scan, 36e5);
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
