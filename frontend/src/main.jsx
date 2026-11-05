import React from 'react'; import ReactDOM from 'react-dom/client'; import { BrowserRouter } from 'react-router-dom';
import App from './App'; import { AuthProvider } from './auth'; import { ToastProvider } from './ui'; import { RealtimeProvider } from './socket'; import './index.css';
if (localStorage.getItem('tf_theme') === 'dark') document.documentElement.classList.add('dark');
ReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><ToastProvider><AuthProvider><RealtimeProvider><App /></RealtimeProvider></AuthProvider></ToastProvider></BrowserRouter>);
