import { Routes, Route, Navigate } from 'react-router-dom';
import { Protected } from './auth'; import Layout from './Layout';
import { Login, Register } from './pages/Auth'; import Dashboard from './pages/Dashboard'; import Projects from './pages/Projects';
import Chat from './pages/Chat'; import Admin from './pages/Admin'; import Notifications from './pages/Notifications'; import { Verify, Forgot } from './pages/Verify'; import Kanban from './pages/Kanban'; import { Team, Placeholder } from './pages/Misc';
const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/verify" element={<Verify />} /><Route path="/forgot" element={<Forgot />} />
    <Route element={<Protected><Layout /></Protected>}>
      <Route path="/" element={<Dashboard />} /><Route path="/my-tasks" element={<Kanban mine />} /><Route path="/projects" element={<Projects />} />
      <Route path="/kanban" element={<Kanban />} /><Route path="/team" element={<Team />} />
      <Route path="/chat" element={<Chat />} /><Route path="/admin" element={<Admin />} />
      <Route path="/calendar" element={<Placeholder title="Calendar" text="A deadline calendar is planned for a later part." />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Placeholder title="Settings" text="Profile and workspace settings arrive in Part 2." />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
export default App;
