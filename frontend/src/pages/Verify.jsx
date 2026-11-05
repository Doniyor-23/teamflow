import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api'; import { useAuth } from '../auth'; import { Shell, Field, Err } from './Auth';
export const Verify = () => {
  const [sp] = useSearchParams(); const email = sp.get('email') || ''; const { verify } = useAuth(); const nav = useNavigate();
  const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const submit = (e) => { e.preventDefault(); setErr(''); verify({ email, code }).then(() => nav('/')).catch((x) => setErr(errMsg(x))); };
  const resend = () => { setErr(''); api.post('/auth/resend', { email }).then(() => setInfo('If this account is waiting for verification, a new code was sent.')).catch((x) => setErr(errMsg(x))); };
  return (<Shell title="Verify your email" footer={<Link className="text-indigo-600" to="/login">Back to sign in</Link>}>
    <p className="fx mb-4 text-sm text-slate-500">Enter the 6-digit code sent to {email}. It expires in 10 minutes.</p>
    <form onSubmit={submit} className="space-y-4"><input className="input fx text-center text-xl tracking-[0.5em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Verification code" />
      <Err msg={err} />{info && <p className="text-sm text-emerald-600">{info}</p>}
      <div className="fx flex gap-2"><button className="btn flex-1" disabled={code.length !== 6}>Verify email</button><button type="button" className="btn-ghost" onClick={resend}>Resend code</button></div></form></Shell>);
};
export const Forgot = () => {
  const nav = useNavigate(); const [step, setStep] = useState(1); const [f, setF] = useState({ email: '', code: '', password: '' }); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (e) => { e.preventDefault(); setErr('');
    (step === 1 ? api.post('/auth/forgot', { email: f.email }).then(() => setStep(2)) : api.post('/auth/reset', f).then(() => nav('/login'))).catch((x) => setErr(errMsg(x))); };
  return (<Shell title="Reset your password" footer={<Link className="text-indigo-600" to="/login">Back to sign in</Link>}>
    <form onSubmit={go} className="space-y-4"><Field label="Email" type="email" required value={f.email} onChange={set('email')} disabled={step === 2} />
      {step === 2 && <><p className="text-sm text-slate-500">If the account exists, a code was emailed. Enter it with a new password.</p><Field label="Code" inputMode="numeric" maxLength={6} required value={f.code} onChange={set('code')} />
        <Field label="New password (8+ characters)" type="password" minLength={8} required value={f.password} onChange={set('password')} /></>}
      <Err msg={err} /><button className="btn fx w-full">{step === 1 ? 'Send code' : 'Reset password'}</button></form></Shell>);
};
