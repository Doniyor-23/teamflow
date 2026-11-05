import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form'; import { zodResolver } from '@hookform/resolvers/zod'; import { z } from 'zod';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap'; import { Columns3 } from 'lucide-react';
import { useAuth } from '../auth'; import { errMsg } from '../api'; import { reduced } from '../ui';
export const Shell = ({ title, children, footer }) => {
  const ref = useRef(); useGSAP(() => { if (!reduced()) gsap.from('.fx', { y: 18, opacity: 0, stagger: 0.07, duration: 0.5, clearProps: 'all' }); }, { scope: ref });
  return (<div ref={ref} className="grid min-h-screen place-items-center bg-navy-900 p-4"><div className="fx w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
    <div className="fx mb-6 flex items-center gap-2 text-lg font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-white"><Columns3 size={18} /></span>TeamFlow</div>
    <h1 className="fx mb-5 text-2xl font-bold">{title}</h1>{children}<p className="fx mt-5 text-sm text-slate-500">{footer}</p></div></div>);
};
export const Field = ({ label, error, reg, ...p }) => (<div className="fx"><label className="label">{label}</label><input className="input" {...reg} {...p} />{error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}</div>);
export const Err = ({ msg }) => msg && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</p>;
export const Login = () => {
  const { user, login } = useAuth(); const [err, setErr] = useState(''); const nav = useNavigate();
  const f = useForm({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })) });
  if (user) return <Navigate to="/" replace />;
  return (<Shell title="Sign in" footer={<>New here? <Link className="text-indigo-600" to="/register">Create an account</Link> · <Link className="text-indigo-600" to="/forgot">Forgot password?</Link></>}>
    <form className="space-y-4" onSubmit={f.handleSubmit((d) => login(d).catch((e) => (e.response?.data?.needsVerification ? nav(`/verify?email=${encodeURIComponent(d.email)}`) : setErr(errMsg(e)))))}>
      <Field label="Email" type="email" reg={f.register('email')} error={f.formState.errors.email} />
      <Field label="Password" type="password" reg={f.register('password')} error={f.formState.errors.password} />
      <Err msg={err} /><button className="btn fx w-full" disabled={f.formState.isSubmitting}>Sign in</button></form></Shell>);
};
const s = z.string().trim().min(1, 'Required');
const schema = z.object({ firstName: s, lastName: s, email: z.string().email('Enter a valid email'), phone: z.string().min(5, 'Enter a phone number'), jobTitle: s, department: s,
  avatar: z.string().url('Enter a valid URL').optional().or(z.literal('')), password: z.string().min(8, 'At least 8 characters'), confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export const Register = () => {
  const { user, register } = useAuth(); const [err, setErr] = useState(''); const nav = useNavigate();
  const f = useForm({ resolver: zodResolver(schema) }); const e = f.formState.errors; const r = f.register;
  if (user) return <Navigate to="/" replace />;
  const submit = ({ confirm, ...d }) => register(d).then((r) => nav(`/verify?email=${encodeURIComponent(r.data.email)}`)).catch((x) => setErr(errMsg(x)));
  return (<Shell title="Create your account" footer={<>Already registered? <Link className="text-indigo-600" to="/login">Sign in</Link></>}>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={f.handleSubmit(submit)}>
      <Field label="First name" reg={r('firstName')} error={e.firstName} /><Field label="Last name" reg={r('lastName')} error={e.lastName} />
      <Field label="Email" type="email" reg={r('email')} error={e.email} /><Field label="Phone" type="tel" reg={r('phone')} error={e.phone} />
      <Field label="Job title" reg={r('jobTitle')} error={e.jobTitle} /><Field label="Department" reg={r('department')} error={e.department} />
      <Field label="Password" type="password" reg={r('password')} error={e.password} /><Field label="Confirm password" type="password" reg={r('confirm')} error={e.confirm} />
      <div className="sm:col-span-2"><Field label="Avatar URL (optional)" reg={r('avatar')} error={e.avatar} /></div>
      <div className="space-y-3 sm:col-span-2"><Err msg={err} /><button className="btn w-full" disabled={f.formState.isSubmitting}>Create account</button></div></form></Shell>);
};
