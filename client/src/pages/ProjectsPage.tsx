import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const load = () => {
    setLoading(true);
    api.getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (canCreate) {
      api.getClients().then(setClients).catch(() => {});
    }
  }, [canCreate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createProject({ title, description, clientId });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setClientId('');
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="empty">Loading projects…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2>Projects</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'New project'}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label>Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">Create</button>
          </form>
        </div>
      )}

      {projects.length === 0 && <div className="empty">No projects found</div>}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.title}</strong>
                {p.client && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem', fontSize: '0.85rem' }}>
                    {p.client.name}
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {p._count?.tasks ?? 0} tasks
              </span>
            </div>
            {p.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                {p.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
