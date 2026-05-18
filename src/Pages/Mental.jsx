import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import "./Mental.css";

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
}

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

function Mental({ setPage }) {
  const [sleepTime, setSleepTime]     = useState("");
  const [wakeTime, setWakeTime]       = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [dayScale, setDayScale]       = useState("");
  const [worries, setWorries]         = useState("");
  const [extraTime, setExtraTime]     = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState("");

  const [showHistory, setShowHistory]       = useState(false);
  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded]   = useState(false);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) { setError("Please log in first."); return; }

    setError("");
    try {
      await addDoc(collection(db, "users", user.uid, "mentalChecks"), {
        sleepTime,
        wakeTime,
        stressLevel,
        dayScale,
        worries,
        extraTime,
        submittedAt: Date.now(),
      });
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 700);
      setSubmitted(true);
      setHistoryLoaded(false);

      setSleepTime("");
      setWakeTime("");
      setStressLevel("");
      setDayScale("");
      setWorries("");
      setExtraTime("");
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    }
  };

  const loadHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setHistoryLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users", user.uid, "mentalChecks"), orderBy("submittedAt", "desc"), limit(20))
      );
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setHistoryLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && !historyLoaded) loadHistory();
    setShowHistory(h => !h);
  };

  return (
    <div className="mental-page">
      <div className="mental-banner">
        <h1 className="mental-title">Mental Check</h1>
      </div>

      <div className="mental-content">
        <p className="mental-subtitle">
          Please fill this out once every week so we can provide accurate data for you.
        </p>
        <div className="view-mental">
          <button className="pastButton" onClick={() => setPage?.("ViewMental")}>View Past Mental Checks</button>
        </div>

        {submitted && (
          <div className="mental-success">
            ✅ Check-in saved! Come back next week.
          </div>
        )}

        {error && <p className="mental-error">{error}</p>}

        <div className="mental-grid">
          {/* Left column */}
          <div className="mental-column">
            <div className="mental-question">
              <label className="mental-card">What time did you sleep yesterday?</label>
              <input
                className="mental-input"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">When did you wake up?</label>
              <input
                className="mental-input"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">
                On a scale from 1–5, how often did you feel unable to control important things this week?
              </label>
              <input
                className="mental-input"
                type="number"
                min="1"
                max="5"
                placeholder="1 – 5"
                value={stressLevel}
                onChange={(e) => setStressLevel(e.target.value)}
              />
            </div>
          </div>

          {/* Center submit button */}
          <button className={`mental-submit ${celebrating ? 'celebrating' : ''}`} onClick={handleSubmit}>
            Click to<br />upload it!
          </button>

          {/* Right column */}
          <div className="mental-column">
            <div className="mental-question">
              <label className="mental-card">On a scale from 1–10, how was your day?</label>
              <input
                className="mental-input"
                type="number"
                min="1"
                max="10"
                placeholder="1 – 10"
                value={dayScale}
                onChange={(e) => setDayScale(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">List out your worries / concerns</label>
              <textarea
                className="mental-input mental-textarea"
                placeholder="Anything on your mind…"
                rows={3}
                value={worries}
                onChange={(e) => setWorries(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">How much time did you spend on extracurriculars?</label>
              <input
                className="mental-input"
                placeholder="e.g. 2 hours"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Past uploads inline */}
        <div className="mh-history-wrap">
          <button className="mh-history-btn" onClick={toggleHistory}>
            {showHistory ? '▲ Hide past check-ins' : '▼ View past check-ins'}
          </button>

          {showHistory && (
            <div className="mh-history-list">
              {historyLoading && <p className="mh-loading">Loading…</p>}
              {!historyLoading && history.length === 0 && (
                <p className="mh-loading">No check-ins yet. Submit your first one above!</p>
              )}
              {history.map(entry => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Mental;
