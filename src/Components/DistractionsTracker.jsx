import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, getDoc,
} from 'firebase/firestore';
import './Trackers.css';

function DistractionsTracker({ user, selectedDate }) {
  const [entries, setEntries]         = useState([]);
  const [name, setName]               = useState('');
  const [duration, setDuration]       = useState('');
  const [loading, setLoading]         = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const raw = snap.exists() ? snap.data().distractions : '';
      if (raw) setSuggestions(raw.split(',').map(s => s.trim()).filter(Boolean));
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return; }
    const q = query(
      collection(db, 'users', user.uid, 'distractionLog'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
  }, [user]);

  const visible = entries.filter(e => e.date === selectedDate);
  const totalMinutes = visible.reduce((sum, e) => {
    const match = e.duration?.match(/(\d+(\.\d+)?)/);
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);

  const add = async () => {
    if (!name.trim() || !user) return;
    await addDoc(collection(db, 'users', user.uid, 'distractionLog'), {
      name: name.trim(),
      duration: duration.trim() || null,
      date: selectedDate,
      createdAt: Date.now(),
    });
    setName('');
    setDuration('');
  };

  const remove = (id) => {
    setDeletingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      deleteDoc(doc(db, 'users', user.uid, 'distractionLog', id));
      setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 300);
  };

  return (
    <div className="lc-card lc-card--distraction">
      <div className="lc-title-row">
        <h2 className="lc-title">Distractions Log</h2>
        {visible.length > 0 && totalMinutes > 0 && (
          <span className="lc-total lc-total--distraction">{totalMinutes} min lost</span>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="lc-chips">
          {suggestions.map(s => (
            <button key={s} className="lc-chip lc-chip--distraction" onClick={() => setName(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="lc-input-row">
        <input
          className="lc-input lc-input--flex"
          type="text"
          placeholder="What distracted you?"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <input
          className="lc-input lc-input--sm"
          type="text"
          placeholder="Duration"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="lc-add-btn lc-add-btn--distraction" onClick={add}>Log</button>
      </div>

      {loading ? (
        <p className="lc-empty">Loading…</p>
      ) : (
        <ul className="lc-items">
          {visible.length === 0 && (
            <li className="lc-empty">No distractions logged. Nice work!</li>
          )}
          {visible.map(entry => (
            <li
              key={entry.id}
              className={`lc-item ${deletingIds.has(entry.id) ? 'lc-item--exit' : ''}`}
            >
              <span className="lc-item-icon">📵</span>
              <span className="lc-item-name">{entry.name}</span>
              {entry.duration && (
                <span className="lc-badge lc-badge--distraction">{entry.duration}</span>
              )}
              <button className="lc-delete-btn" onClick={() => remove(entry.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DistractionsTracker;
