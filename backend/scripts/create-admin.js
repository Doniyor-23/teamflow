import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models.js';

const args = process.argv.slice(2);
const email = args[0] || process.env.ADMIN_EMAIL || 'admin@gmail.com';
const pw = args[1] || process.env.ADMIN_PASSWORD || 'Admin1234';
const f = process.env.ADMIN_FIRST_NAME || 'Admin';
const l = process.env.ADMIN_LAST_NAME || 'User';

if (!email || !pw || pw.length < 6) {
  console.error('Set email and password (at least 6 characters).');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teamflow');
  const e = email.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(pw, 12);
  let u = await User.findOne({ email: e });

  if (u) {
    u.role = 'admin';
    u.emailVerified = true;
    u.active = true;
    u.password = hashedPassword;
    await u.save();
    console.log(`Admin account updated successfully: ${e}`);
  } else {
    await User.create({
      firstName: f,
      lastName: l,
      email: e,
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      active: true,
      jobTitle: 'Administrator',
      department: 'Management',
      phone: '+998901234567'
    });
    console.log(`Admin account created successfully: ${e}`);
  }
} catch (error) {
  console.error('Failed to create/update admin:', error.message);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
