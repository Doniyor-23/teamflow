import nodemailer from 'nodemailer'; import crypto from 'crypto'; import { E } from './util.js';
export const hashCode = (c) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(c)).digest('hex');
const transport = () => {
  if (!process.env.SMTP_HOST) throw E(503, 'Email is not configured on the server. Set the SMTP_* variables in backend/.env.');
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587, secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
};
export const sendCode = async (user, purpose, invited = false) => {
  if (user.codeSentAt && Date.now() - user.codeSentAt < 60000) throw E(429, 'Wait a minute before requesting another code.');
  const code = String(crypto.randomInt(100000, 1000000)); const t = transport();
  Object.assign(user, { codeHash: hashCode(code), codeExpires: new Date(Date.now() + 600000), codeAttempts: 0, codeSentAt: new Date(), codePurpose: purpose });
  await user.save();
  const text = invited ? `You have been invited to TeamFlow. Open the sign-in page, choose "Forgot password", and use this code to set your password: ${code}\nIt expires in 10 minutes.`
    : `Your TeamFlow ${purpose === 'verify' ? 'verification' : 'password reset'} code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`;
  try { await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: user.email, subject: invited ? 'You are invited to TeamFlow' : 'Your TeamFlow code', text }); }
  catch { throw E(502, 'The email could not be sent. Check the SMTP settings.'); }
};
export const checkCode = async (user, code, purpose) => {
  if (!user?.codeHash || user.codePurpose !== purpose || user.codeExpires < new Date() || user.codeAttempts >= 5) throw E(400, 'The code expired or was not requested. Request a new one.');
  const a = Buffer.from(hashCode(code)), b = Buffer.from(user.codeHash);
  if (!crypto.timingSafeEqual(a, b)) { user.codeAttempts += 1; await user.save(); throw E(400, `Incorrect code. ${Math.max(0, 5 - user.codeAttempts)} attempts left.`); }
  Object.assign(user, { codeHash: undefined, codeExpires: undefined, codePurpose: undefined, codeAttempts: 0 });
};
