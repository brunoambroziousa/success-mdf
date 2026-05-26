import { useCallback, useEffect, useState } from 'react';
import ProfileForm from './components/ProfileForm.jsx';
import ProfileTable from './components/ProfileTable.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const fetchProfiles = useCallback(async () => {
    setError('');
    setStatus('Loading…');
    try {
      const res = await fetch(`${API_URL}/profiles`);
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (e) {
      setStatus('');
      setError(e.message);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleSubmit = async (payload) => {
    setError('');
    try {
      if (editing) {
        const res = await fetch(`${API_URL}/profiles/${encodeURIComponent(editing.externalCode)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok && res.status !== 204) throw new Error(await readError(res));
      } else {
        const res = await fetch(`${API_URL}/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res));
      }
      setEditing(null);
      await fetchProfiles();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete profile ${id}?`)) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(await readError(res));
      await fetchProfiles();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="app">
      <h1>SuccessFactors MDF Profiles</h1>

      <div className="card">
        <h2>{editing ? `Edit ${editing.externalCode}` : 'Create new profile'}</h2>
        <ProfileForm
          key={editing?.externalCode || 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={editing ? () => setEditing(null) : null}
        />
      </div>

      <div className="card">
        <h2>Profiles</h2>
        {status && <div className="status">{status}</div>}
        {error && <div className="error">{error}</div>}
        <ProfileTable profiles={profiles} onEdit={setEditing} onDelete={handleDelete} />
        <button className="secondary" onClick={fetchProfiles}>Refresh</button>
      </div>
    </div>
  );
}

async function readError(res) {
  try {
    const body = await res.json();
    return typeof body.error === 'string' ? body.error : JSON.stringify(body.error || body, null, 2);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
