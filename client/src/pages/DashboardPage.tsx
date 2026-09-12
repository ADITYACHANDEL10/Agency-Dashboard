import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const { onlineCount } = useSocket();

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">Loading dashboard…</div>;

  if (data.role === 'ADMIN') {
    return (
      <div>
        <h2 style={{ marginBottom: '1.25rem' }}>Admin Overview</h2>
        <div className="grid-stats">
          <div className="stat-card">
            <div className="label">Projects</div>
            <div className="value">{data.totalProjects}</div>
          </div>
          <div className="stat-card">
            <div className="label">Overdue</div>
            <div className="value" style={{ color: 'var(--danger)' }}>{data.overdueCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Online now</div>
            <div className="value">{onlineCount || data.onlineUsers || 0}</div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Tasks by status</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(data.tasksByStatus || {}).map(([status, count]) => (
              <div key={status}>
                <span className={`badge badge-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
                <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.role === 'PROJECT_MANAGER') {
    return (
      <div>
        <h2 style={{ marginBottom: '1.25rem' }}>My Projects</h2>
        <div className="grid-stats">
          <div className="stat-card">
            <div className="label">Projects</div>
            <div className="value">{data.projectCount}</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Tasks by priority</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(data.tasksByPriority || {}).map(([p, count]) => (
              <div key={p}>
                <span className={`badge badge-${p.toLowerCase()}`}>{p}</span>
                <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>{count as number}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Upcoming due this week</h3>
          {(data.upcomingDueThisWeek || []).length === 0 && <div className="empty">Nothing due this week</div>}
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {(data.upcomingDueThisWeek || []).map((t: any, i: number) => (
                <tr key={i}>
                  <td>{t.projectTitle}</td>
                  <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span></td>
                  <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Projects</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {(data.projects || []).map((p: any) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="card" style={{ display: 'block' }}>
                <strong>{p.title}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem', fontSize: '0.85rem' }}>
                  {p.taskCount} tasks
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Developer
  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>My Tasks</h2>
      {(data.assignedTasks || []).length === 0 && <div className="empty">No tasks assigned</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Project</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {(data.assignedTasks || []).map((t: any) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.project?.title}</td>
              <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span></td>
              <td><span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
