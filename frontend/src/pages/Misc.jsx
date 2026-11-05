import { useEffect, useState } from 'react';
import { Construction } from 'lucide-react';
import api, { errMsg } from '../api'; import { Avatar, Empty, Skeletons, name, useToast } from '../ui';
export const Placeholder = ({ title, text }) => <div className="space-y-6"><h1 className="text-2xl font-bold">{title}</h1><Empty icon={Construction} title="Coming soon" text={text} /></div>;
export const Team = () => {
  const [users, setUsers] = useState(null); const toast = useToast();
  useEffect(() => { api.get('/users').then((r) => setUsers(r.data.users)).catch((e) => { toast(errMsg(e), 'error'); setUsers([]); }); }, []);
  return (<div className="space-y-6"><h1 className="text-2xl font-bold">Team</h1>{!users ? <Skeletons h="h-28" /> :
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{users.map((u) => (<div key={u._id} className="card flex items-center gap-4"><Avatar user={u} size={48} />
      <div className="min-w-0"><p className="font-semibold">{name(u)}</p><p className="truncate text-sm text-slate-500">{u.jobTitle} · {u.department}</p><p className="truncate text-xs text-slate-400">{u.email}</p></div></div>))}</div>}</div>);
};
