import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import "./ViewMental.css";
import "./Mental.css";

function sleepHours(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return null;
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let diff = (wh * 60 + wm) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return (diff / 60).toFixed(1);
}

function HistoryEntry({ entry }) {
  const date = entry.submittedAt
    ? new Date(entry.submittedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown date';
  const hrs = sleepHours(entry.sleepTime, entry.wakeTime);

  return (
    <div className="mh-entry">
      <div className="mh-entry-date">{date}</div>
      <div className="mh-entry-stats">
        {hrs && <span className="mh-chip">😴 {hrs}h sleep</span>}
        {entry.stressLevel && <span className="mh-chip">😓 Stress {entry.stressLevel}/5</span>}
        {entry.dayScale && <span className="mh-chip">⭐ Day {entry.dayScale}/10</span>}
        {entry.extraTime && <span className="mh-chip">🏃 {entry.extraTime}</span>}
      </div>
      {entry.worries && (
        <p className="mh-entry-worries">"{entry.worries}"</p>
      )}
    </div>
  );
}

function ViewMental({ setPage }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    getDocs(query(collection(db, "users", user.uid, "mentalChecks"), orderBy("submittedAt", "desc")))
      .then(snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mental-page">
      <div className="mental-banner">
        <button className="viewMental-back-btn" onClick={() => setPage?.("Mental")}>← Back</button>
        <h1 className="mental-title">Past Mental Checks</h1>
      </div>
      <div className="mental-content">
        {loading && <p className="mh-loading">Loading…</p>}
        {!loading && history.length === 0 && (
          <p className="mh-loading">No check-ins yet. Fill out your first one on the Mental Check page!</p>
        )}
        <div className="mh-history-list" style={{ maxWidth: 800, width: '100%' }}>
          {history.map(entry => (
            <HistoryEntry key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ViewMental;
