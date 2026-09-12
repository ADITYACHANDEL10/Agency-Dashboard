import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Task } from '../types';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (from) params.from = from;
    if (to) params.to = to;

    api.getTasks(params)
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, priority, from, to]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>Tasks</h2>

      <div className="filters">
        <select value={status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <select value={priority} onChange={(e) => updateFilter('priority', e.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => updateFilter('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
          placeholder="From"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => updateFilter('to', e.target.value ? new Date(e.target.value).toISOString() : '')}
          placeholder="To"
        />
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="empty">Loading…</div>}

      {!loading && tasks.length === 0 && <div className="empty">No tasks match filters</div>}

      {!loading && tasks.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.project?.title || '—'}</td>
                <td>{t.assignee?.name || '—'}</td>
                <td>
                  <span className={`badge badge-${t.status.toLowerCase()}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                </td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
