import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import { User } from '../src/models.js';
const PASSWORD = 'Teamflow12345';
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teamflow');
const hash = await bcrypt.hash(PASSWORD, 12);
for (const role of ['admin', 'manager', 'member']) {
  for (let i = 1; i <= 5; i++) {
    const email = `${role}${i}@test.com`;
    await User.updateOne({ email }, { $set: { firstName: role[0].toUpperCase() + role.slice(1), lastName: String(i), email, password: hash, role,
      emailVerified: true, active: true, phone: '+998900000000', jobTitle: role, department: 'Test' } }, { upsert: true });
    console.log('Created', email);
  }
}
await mongoose.disconnect();