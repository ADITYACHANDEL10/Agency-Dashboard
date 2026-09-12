import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import type { ActivityLog } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  useEffect(() => {
    api.getActivity(30)
      .then(setActivities)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsub = on('activity:new', (act: ActivityLog) => {
      setActivities((prev) => {
        // avoid duplicates
        if (prev.some((a) => a.id === act.id)) return prev;
        return [act, ...prev].slice(0, 50);
      });
    });
    return unsub;
  }, [on]);

  if (loading) return <div className="empty">Loading activity…</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>Activity Feed</h2>
      <div className="card">
        {activities.length === 0 && <div className="empty">No activity yet</div>}
        {activities.map((a) => (
          <div key={a.id} className="activity-item">
            <div>{a.message}</div>
            <div className="meta">
              {a.user?.name || 'Someone'}
              {a.project?.title ? ` · ${a.project.title}` : ''}
              {' · '}
              {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
