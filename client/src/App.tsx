import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TasksPage from './pages/TasksPage';
import ActivityPage from './pages/ActivityPage';
import { useState, useEffect, useRef } from 'react';
import { api } from './lib/api';
import { useSocket } from './hooks/useSocket';
import type { Notification } from './types';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { onlineCount, on } = useSocket();

  useEffect(() => {
    api.getNotifications().then((d) => {
      setNotifs(d.notifications);
      setUnread(d.unreadCount);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = on('notification:new', () => {
      setUnread((c) => c + 1);
      api.getNotifications().then((d) => {
        setNotifs(d.notifications);
        setUnread(d.unreadCount);
      }).catch(() => {});
    });
    return unsub;
  }, [on]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await api.markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/activity', label: 'Activity' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">Agency HQ</div>
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={location.pathname === item.to ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {user?.name}
          <br />
          <span style={{ textTransform: 'capitalize' }}>
            {user?.role.replace('_', ' ').toLowerCase()}
          </span>
        </div>
        <button className="nav" onClick={() => logout()}>
          Log out
        </button>
      </aside>
      <div className="main">
        <header className="topbar">
          {user?.role === 'ADMIN' && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
              {onlineCount} online
            </span>
          )}
          <div className="notif-badge" ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="btn-ghost" onClick={() => setOpen(!open)}>
              Notifications
              {unread > 0 && <span className="count">{unread}</span>}
            </button>
            {open && (
              <div className="dropdown">
                <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Notifications</strong>
                  {unread > 0 && (
                    <button className="btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={markAll}>
                      Mark all read
                    </button>
                  )}
                </div>
                {notifs.length === 0 && <div className="empty">No notifications</div>}
                {notifs.slice(0, 15).map((n) => (
                  <div
                    key={n.id}
                    className={`dropdown-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => !n.isRead && markRead(n.id)}
                  >
                    <div style={{ fontWeight: 500 }}>{n.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
      <Route path="/activity" element={<PrivateRoute><ActivityPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
