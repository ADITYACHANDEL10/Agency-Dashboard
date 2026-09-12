import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import type { Task, ActivityLog } from '../types';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'] as const;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { joinProject, leaveProject, on } = useSocket();

  const load = () => {
    if (!id) return;
    api.getProject(id)
      .then(setProject)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    api.getActivity(20).then((acts) => {
      // filter client-side for this project if needed
      setActivities(acts.filter((a: any) => a.projectId === id));
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    joinProject(id);
    const unsub1 = on('task:updated', (task: Task) => {
      if (task.projectId === id) {
        setProject((prev: any) => {
          if (!prev) return prev;
          const tasks = prev.tasks.map((t: Task) => (t.id === task.id ? { ...t, ...task } : t));
          return { ...prev, tasks };
        });
      }
    });
    const unsub2 = on('activity:new', (act: ActivityLog) => {
      if (act.projectId === id) {
        setActivities((prev) => [act, ...prev].slice(0, 30));
      }
    });
    const unsub3 = on('task:created', (task: Task) => {
      if (task.projectId === id) {
        setProject((prev: any) => {
          if (!prev) return prev;
          return { ...prev, tasks: [...(prev.tasks || []), task] };
        });
      }
    });
    return () => {
      leaveProject(id);
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [id, joinProject, leaveProject, on]);

  const changeStatus = async (taskId: string, status: string) => {
    setUpdating(taskId);
    try {
      await api.updateTaskStatus(taskId, status);
      // live update will arrive via socket; also optimistically update
      setProject((prev: any) => {
        if (!prev) return prev;
        const tasks = prev.tasks.map((t: Task) =>
          t.id === taskId ? { ...t, status: status as any } : t
        );
        return { ...prev, tasks };
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!project) return <div className="empty">Loading project…</div>;

  const canEditStatus = user?.role !== undefined;

  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        <Link to="/projects" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ← Projects
        </Link>
      </div>
      <h2 style={{ marginBottom: '0.25rem' }}>{project.title}</h2>
      {project.client && (
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          {project.client.name}
          {project.client.company ? ` · ${project.client.company}` : ''}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Tasks</h3>
          {(project.tasks || []).length === 0 && <div className="empty">No tasks</div>}
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {(project.tasks || []).map((t: Task) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.assignee?.name || '—'}</td>
                  <td>
                    <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  </td>
                  <td>
                    {canEditStatus ? (
                      <select
                        value={t.status}
                        disabled={updating === t.id}
                        onChange={(e) => changeStatus(t.id, e.target.value)}
                        style={{ width: 'auto', minWidth: 120 }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge badge-${t.status.toLowerCase()}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Activity</h3>
          <div className="card" style={{ maxHeight: 480, overflowY: 'auto' }}>
            {activities.length === 0 && <div className="empty">No activity yet</div>}
            {activities.map((a) => (
              <div key={a.id} className="activity-item">
                <div>{a.message}</div>
                <div className="meta">
                  {a.user?.name || 'Someone'} · {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
