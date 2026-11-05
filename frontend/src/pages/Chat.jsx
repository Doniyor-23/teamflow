import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react'; import gsap from 'gsap';
import { Send, Plus, Search, Pencil, Trash2, ArrowLeft, MessageSquare, Settings2 } from 'lucide-react';
import api, { errMsg } from '../api'; import { useAuth } from '../auth'; import { useRT } from '../socket'; import { Avatar, Empty, Modal, name, reduced, useToast } from '../ui';
const other = (c, me) => c.members.find((m) => m._id !== me) || c.members[0];
const title = (c, me) => (c.type === 'group' ? c.name : name(other(c, me)));
const Bubble = ({ m, mine, group, onEdit, onDelete }) => {
  const ref = useRef(); useGSAP(() => { if (m.fresh && !reduced()) gsap.from(ref.current, { y: 10, opacity: 0, duration: 0.25 }); }, { scope: ref });
  return (<div ref={ref} className={`group flex ${mine ? 'justify-end' : ''}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
    {group && !mine && <p className="text-xs font-semibold text-indigo-500">{name(m.sender)}</p>}
    <p className={m.deleted ? 'italic opacity-60' : 'whitespace-pre-wrap break-words'}>{m.deleted ? 'Message deleted' : m.text}</p>
    <p className="mt-1 flex items-center gap-2 text-[11px] opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{m.editedAt && !m.deleted && 'edited'}{mine && !m.deleted && (m.readBy?.length > 1 ? 'Seen' : 'Sent')}
      {mine && !m.deleted && <><button onClick={() => onEdit(m)} aria-label="Edit message"><Pencil size={11} /></button><button onClick={() => onDelete(m)} aria-label="Delete message"><Trash2 size={11} /></button></>}</p></div></div>);
};
const GroupForm = ({ conv, users, onClose, onSaved }) => {
  const toast = useToast(); const [f, setF] = useState({ name: conv?.name || '', description: conv?.description || '', avatar: conv?.avatar || '', members: (conv?.members || []).map((m) => m._id) });
  const submit = async (e) => { e.preventDefault(); try { const r = conv ? await api.put(`/chat/groups/${conv._id}`, f) : await api.post('/chat/groups', f); toast(conv ? 'Group updated' : 'Group created'); onSaved(r.data.conversation); } catch (x) { toast(errMsg(x), 'error'); } };
  return (<form onSubmit={submit} className="space-y-3"><div><label className="label">Group name</label><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
    <div><label className="label">Description</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
    <div><label className="label">Avatar URL (optional)</label><input className="input" value={f.avatar} onChange={(e) => setF({ ...f, avatar: e.target.value })} /></div>
    <div><label className="label">Members</label><select multiple className="input h-32" value={f.members} onChange={(e) => setF({ ...f, members: [...e.target.selectedOptions].map((o) => o.value) })}>{users.map((u) => <option key={u._id} value={u._id}>{name(u)}</option>)}</select></div>
    <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn">Save group</button></div></form>);
};
const Chat = () => {
  const { user } = useAuth(); const { socket, online, epoch } = useRT(); const toast = useToast();
  const [convs, setConvs] = useState(null); const [users, setUsers] = useState([]); const [active, setActive] = useState(null); const [msgs, setMsgs] = useState([]); const [text, setText] = useState('');
  const [editing, setEditing] = useState(null); const [q, setQ] = useState(''); const [mq, setMq] = useState(''); const [typing, setTyping] = useState(null); const [modal, setModal] = useState(null);
  const act = useRef(null); act.current = active; const end = useRef(); const lastT = useRef(0); const canGroup = user.role !== 'member';
  useEffect(() => { api.get('/chat/conversations').then((r) => setConvs(r.data.conversations)).catch((e) => { toast(errMsg(e), 'error'); setConvs([]); }); api.get('/users').then((r) => setUsers(r.data.users.filter((u) => u._id !== user._id))).catch(() => {}); }, [epoch]);
  const touch = (m, mineMsg, isActive) => setConvs((l) => l && l.map((c) => (c._id === m.conversation ? { ...c, last: m, lastMessageAt: m.createdAt, unread: isActive || mineMsg ? 0 : (c.unread || 0) + 1 } : c)).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
  const add = (m, fresh) => { setMsgs((l) => (l.some((x) => x._id === m._id) ? l.map((x) => (x._id === m._id ? m : x)) : [...l, { ...m, fresh }])); };
  const open = (c) => { setActive(c._id); setEditing(null); setText(''); setMq(''); };
  useEffect(() => { if (!active) return; api.get(`/chat/${active}/messages`, { params: { q: mq || undefined } }).then((r) => setMsgs(r.data.messages)).catch((e) => toast(errMsg(e), 'error'));
    api.post(`/chat/${active}/read`).catch(() => {}); setConvs((l) => l && l.map((c) => (c._id === active ? { ...c, unread: 0 } : c))); }, [active, mq, epoch]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, active]);
  useEffect(() => { if (!socket) return;
    const onMsg = (m) => { const cur = act.current === String(m.conversation); if (cur) { add(m, true); api.post(`/chat/${m.conversation}/read`).catch(() => {}); } touch(m, m.sender._id === user._id, cur); };
    const onUp = (m) => setMsgs((l) => l.map((x) => (x._id === m._id ? m : x)));
    const onRead = ({ conversationId, userId }) => { if (act.current === conversationId) setMsgs((l) => l.map((x) => ({ ...x, readBy: [...new Set([...(x.readBy || []).map(String), userId])] }))); };
    const onTyping = (t) => { if (act.current === t.conversationId) { setTyping(t.name); clearTimeout(onTyping.t); onTyping.t = setTimeout(() => setTyping(null), 2000); } };
    const onConv = (c) => setConvs((l) => (l && !l.some((x) => x._id === c._id) ? [c, ...l] : l && l.map((x) => (x._id === c._id ? { ...x, ...c, unread: x.unread, last: x.last } : x))));
    const onGone = ({ _id }) => { setConvs((l) => l && l.filter((x) => x._id !== _id)); if (act.current === _id) setActive(null); };
    socket.on('chat:message', onMsg); socket.on('chat:message:updated', onUp); socket.on('chat:read', onRead); socket.on('chat:typing', onTyping); socket.on('chat:conversation', onConv); socket.on('chat:removed', onGone);
    return () => { ['chat:message', 'chat:message:updated', 'chat:read', 'chat:typing', 'chat:conversation', 'chat:removed'].forEach((e) => socket.off(e)); }; }, [socket]);
  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return;
    try { if (editing) { const r = await api.put(`/chat/messages/${editing}`, { text: t }); setMsgs((l) => l.map((x) => (x._id === editing ? r.data.message : x))); setEditing(null); }
      else { const r = await api.post(`/chat/${active}/messages`, { text: t }); add(r.data.message, true); touch(r.data.message, true, true); } setText(''); } catch (x) { toast(errMsg(x), 'error'); } };
  const del = async (m) => { try { const r = await api.delete(`/chat/messages/${m._id}`); setMsgs((l) => l.map((x) => (x._id === m._id ? r.data.message : x))); } catch (x) { toast(errMsg(x), 'error'); } };
  const onType = (e) => { setText(e.target.value); if (socket && Date.now() - lastT.current > 1500) { lastT.current = Date.now(); socket.emit('typing', { conversationId: active }); } };
  const startDirect = async (u) => { try { const r = await api.post('/chat/direct', { userId: u._id }); setConvs((l) => (l.some((c) => c._id === r.data.conversation._id) ? l : [r.data.conversation, ...l])); setModal(null); open(r.data.conversation); } catch (x) { toast(errMsg(x), 'error'); } };
  const saved = (c) => { setModal(null); setConvs((l) => (l.some((x) => x._id === c._id) ? l.map((x) => (x._id === c._id ? { ...x, ...c, unread: x.unread, last: x.last } : x)) : [{ ...c, unread: 0 }, ...l])); open(c); };
  const cur = convs?.find((c) => c._id === active); const shown = (convs || []).filter((c) => title(c, user._id).toLowerCase().includes(q.toLowerCase()));
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Chat</h1>
    <div className="card grid h-[calc(100vh-11rem)] min-h-[420px] overflow-hidden !p-0 md:grid-cols-[300px_1fr]">
      <div className={`flex min-h-0 flex-col border-r border-slate-200 dark:border-slate-800 ${active ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex gap-2 p-3"><div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className="input !pl-8" placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className="btn !px-3" aria-label="New chat" onClick={() => setModal('new')}><Plus size={16} /></button></div>
        <div className="flex-1 overflow-y-auto">{!convs ? <div className="skeleton m-3 h-16" /> : !shown.length ? <p className="p-4 text-sm text-slate-500">No conversations yet. Start one with the + button.</p> : shown.map((c) => (
          <button key={c._id} onClick={() => open(c)} className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${c._id === active ? 'bg-indigo-50 dark:bg-slate-800' : ''}`}>
            <div className="relative"><Avatar user={c.type === 'group' ? { firstName: c.name[0], lastName: c.name[1] || '', avatar: c.avatar } : other(c, user._id)} size={36} />
              {c.type === 'direct' && online.has(other(c, user._id)._id) && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title(c, user._id)}</p><p className="truncate text-xs text-slate-500">{c.last ? (c.last.deleted ? 'Message deleted' : c.last.text) : 'No messages yet'}</p></div>
            {c.unread > 0 && <span className="rounded-full bg-indigo-600 px-2 text-xs text-white">{c.unread}</span>}</button>))}</div></div>
      <div className={`min-h-0 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>{!cur ? <div className="m-auto"><Empty icon={MessageSquare} title="Pick a conversation" text="Choose a chat on the left or start a new one." /></div> : <>
        <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800"><button className="md:hidden" onClick={() => setActive(null)} aria-label="Back"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{title(cur, user._id)}</p><p className="truncate text-xs text-slate-500">{typing ? `${typing} is typing…` : cur.type === 'group' ? `${cur.members.length} members${cur.description ? ` · ${cur.description}` : ''}` : online.has(other(cur, user._id)._id) ? 'Online' : 'Offline'}</p></div>
          <input className="input !w-40" placeholder="Search messages" value={mq} onChange={(e) => setMq(e.target.value)} />
          {cur.type === 'group' && <button className="btn-ghost !px-2" aria-label="Group settings" onClick={() => setModal('edit')}><Settings2 size={16} /></button>}</div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">{msgs.length ? msgs.map((m) => <Bubble key={m._id} m={m} mine={m.sender._id === user._id} group={cur.type === 'group'} onEdit={(x) => { setEditing(x._id); setText(x.text); }} onDelete={del} />) : <p className="text-center text-sm text-slate-500">{mq ? 'No matching messages.' : 'Say hello.'}</p>}<div ref={end} /></div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"><input className="input" placeholder={editing ? 'Edit message' : 'Write a message'} value={text} onChange={onType} maxLength={4000} />
          {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setText(''); }}>Cancel</button>}<button className="btn" aria-label="Send"><Send size={16} /></button></form></>}</div></div>
    {modal === 'new' && <Modal title="New chat" onClose={() => setModal(null)}><div className="space-y-4"><div><p className="label">Direct message</p><div className="max-h-48 overflow-y-auto">{users.map((u) => (
      <button key={u._id} onClick={() => startDirect(u)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Avatar user={u} />{name(u)}</button>))}</div></div>
      {canGroup && <div><p className="label">Or create a group</p><GroupForm users={users} onClose={() => setModal(null)} onSaved={saved} /></div>}</div></Modal>}
    {modal === 'edit' && cur && <Modal title="Group settings" onClose={() => setModal(null)}><GroupForm conv={cur} users={users.concat(cur.members.filter((m) => m._id === user._id))} onClose={() => setModal(null)} onSaved={saved} /></Modal>}</div>);
};
export default Chat;
