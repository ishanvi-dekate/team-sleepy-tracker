import { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, where, getDocs,
} from 'firebase/firestore';
import './Study.css';
import { beforeAuthStateChanged } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// POMODORO TIMER
// ─────────────────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'work',       label: 'Focus',      mins: 25, color: '#7C6FE8' },
  { key: 'short',      label: 'Short Break', mins: 5,  color: '#34d399' },
  { key: 'long',       label: 'Long Break',  mins: 15, color: '#83C9F4' },
];

function pad(n) { return String(n).padStart(2, '0'); }

// Plays a clear three-beep alarm using Web Audio (no external file needed)
function playAlarm() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq, start, dur, vol = 2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain(); 
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    // Two short pings + one long tone
    beep(880,  0,    0.22);
    beep(760,  0.3,  0.22);
    beep(1320, 0.65, 0.55);
    beep(990,  1,    0.22);
    beep(1560,  1.3,  0.22);
    beep(1320, 1.65, 0.55);
    beep(2360,  2,    0.22);
    beep(0,2.5,0,1);
    beep(880, 3, 0.22);
    beep(760, 3.3, 0.22);
    beep(1320, 3.65, 0.55);
    beep(990, 4, 0.22);
    beep(1560, 4.3, 0.22);
    beep(1320, 4.65, 0.55);
    beep(2360, 5, 0.22);
    beep(0, 5.5, 0.1);
    beep(880, 6, 0.22);
    beep(760, 6.3, 0.22);
    beep(1320, 6.65, 0.55);
    beep(990, 7, 0.22);
    beep(1560, 7.3, 0.22);
    beep(1320, 7.65, 0.55);
    beep(2360, 8, 0.22);
    beep(0, 8.5, 0.1);
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch (e) { /* ignore audio failures */ }
}

function PomodoroTimer() {
  const [modeIdx, setModeIdx] = useState(0);
  const [customMins, setCustomMins] = useState({ work: 25, short: 5, long: 15 });
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [alarming, setAlarming] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef  = useRef(null);
  const endAtRef    = useRef(null);
  const firedRef    = useRef(false);
  const mode = MODES[modeIdx];
  const totalMins = customMins[mode.key];

  const reset = useCallback((idx = modeIdx, mins = null) => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    endAtRef.current = null;
    firedRef.current = false;
    setRunning(false);
    setAlarming(false);
    setSeconds((mins ?? customMins[MODES[idx].key]) * 60);
  }, [modeIdx, customMins]);

  const switchMode = (idx) => {
    reset(idx);
    setModeIdx(idx);
  };

  const handleDurationChange = (e) => {
    const v = Math.max(1, Math.min(120, parseInt(e.target.value) || 1));
    setCustomMins(prev => ({ ...prev, [mode.key]: v }));
    setSeconds(v * 60);
  };

  // Toggle start/pause. Tracks an absolute end-time so background tab throttling
  // doesn't slow the countdown.
  const toggleRun = () => {
    if (running) {
      // Pause: capture remaining seconds, stop ticking
      if (endAtRef.current) {
        setSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      }
      setRunning(false);
    } else {
      // Start: request notification permission once, set absolute end
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      endAtRef.current = Date.now() + seconds * 1000;
      firedRef.current = false;
      setAlarming(false);
      setRunning(true);
    }
  };

  // Effect: while running, refresh display and schedule the exact completion time.
  useEffect(() => {
    if (!running || !endAtRef.current) return;

    const complete = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
      setSeconds(0);
      setRunning(false);
      setAlarming(true);
      if (MODES[modeIdx].key === 'work') setSessions(n => n + 1);
      playAlarm();
      playAlarm();
      const body = MODES[modeIdx].key === 'work'
        ? 'Focus session done! Take a break.'
        : 'Break over. Back to work!';
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('efficient.epp - Pomodoro', { body }); } catch (e) {}
      }
      // Flash the tab title so it's obvious when the tab isn't focused
      const original = document.title;
      let toggle = false;
      const titleInterval = setInterval(() => {
        toggle = !toggle;
        document.title = toggle ? ' Time is up!' : original;
      }, 800);
      setTimeout(() => { clearInterval(titleInterval); document.title = original; }, 12000);
    };

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining <= 0) complete();
    };

    tick();
    intervalRef.current = setInterval(tick, 250);
    timeoutRef.current  = setTimeout(complete, Math.max(0, endAtRef.current - Date.now()));

    // When tab regains focus, immediately re-tick so display catches up
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, modeIdx]);

  const dismissAlarm = () => setAlarming(false);

  const total = totalMins * 60;
  const pct   = ((total - seconds) / total) * 100;
  const r = 72, circ = 2 * Math.PI * r;

  return (
    <div className="study-card pomodoro-card">
      <h2 className="study-card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Pomodoro Timer
      </h2>

      {alarming && (
        <div className="pomo-alarm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 003.4 0"/>
          </svg>
          <span className="pomo-alarm-text">
            {mode.key === 'work' ? 'Focus session done! Take a break.' : 'Break over. Back to work!'}
          </span>
          <button className="pomo-alarm-btn pomo-alarm-btn-primary" onClick={dismissAlarm}>Click to stop Alarm</button>
        </div>
      )}

      <div className="pomo-modes">
        {MODES.map((m, i) => (
          <button
            key={m.key}
            className={`pomo-mode-btn ${modeIdx === i ? 'active' : ''}`}
            style={modeIdx === i ? { '--mc': m.color } : {}}
            onClick={() => switchMode(i)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!running && (
        <div className="pomo-duration-row">
          <label className="pomo-duration-label" htmlFor="pomo-mins">Duration</label>
          <button
            type="button"
            className="pomo-duration-step"
            onClick={() => {
              const v = Math.max(1, totalMins - 5);
              setCustomMins(p => ({ ...p, [mode.key]: v }));
              setSeconds(v * 60);
            }}
            aria-label="Decrease duration"
          >−</button>
          <input
            id="pomo-mins"
            type="number"
            min="1"
            max="120"
            value={totalMins}
            onChange={handleDurationChange}
            className="pomo-duration-input"
            style={{ '--pomo-color': mode.color }}
          />
          <button
            type="button"
            className="pomo-duration-step"
            onClick={() => {
              const v = Math.min(120, totalMins + 5);
              setCustomMins(p => ({ ...p, [mode.key]: v }));
              setSeconds(v * 60);
            }}
            aria-label="Increase duration"
          >+</button>
          <span className="pomo-duration-unit">min</span>
        </div>
      )}

      <div className="pomo-ring-wrap">
        <svg className="pomo-ring" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={r} className="pomo-ring-bg"/>
          <circle
            cx="90" cy="90" r={r}
            className="pomo-ring-fill"
            style={{
              stroke: mode.color,
              strokeDasharray: `${circ}`,
              strokeDashoffset: `${circ * (1 - pct / 100)}`,
            }}
          />
        </svg>
        <div className="pomo-time-display">
          <span className="pomo-time">{pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}</span>
          <span className="pomo-mode-label">{mode.label}</span>
        </div>
      </div>

      <div className="pomo-controls">
        <button className="pomo-btn pomo-btn-reset" onClick={() => reset()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </button>
        <button
          className="pomo-btn pomo-btn-main"
          style={{ background: mode.color }}
          onClick={toggleRun}
        >
          {running ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>
        <div className="pomo-sessions">
          {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
            <span key={i} className="pomo-dot" style={{ background: MODES[0].color }}/>
          ))}
          <span className="pomo-session-label">{sessions} done</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - now) / 86400000);
}

function urgencyClass(days) {
  if (days <= 3)  return 'exam-urgent';
  if (days <= 7)  return 'exam-soon';
  if (days <= 14) return 'exam-near';
  return '';
}

function ExamCountdown({ user }) {
  const [exams, setExams]     = useState([]);
  const [name, setName]       = useState('');
  const [date, setDate]       = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'users', user.uid, 'exams'), orderBy('date', 'asc'));
    return onSnapshot(q, snap => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
  }, [user]);

  const add = async () => {
    if (!name.trim() || !date || !user) return;
    await addDoc(collection(db, 'users', user.uid, 'exams'), {
      name: name.trim(), date, subject: subject.trim() || null, createdAt: Date.now(),
    });
    setName(''); setDate(''); setSubject('');
  };

  const remove = (id) => deleteDoc(doc(db, 'users', user.uid, 'exams', id));

  const upcoming = exams.filter(e => daysUntil(e.date) >= 0);
  const past     = exams.filter(e => daysUntil(e.date) < 0);

  return (
    <div className="study-card exam-card">
      <h2 className="study-card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Exam Countdowns
      </h2>

      <div className="exam-add-row">
        <input className="study-input exam-input-name" placeholder="Exam / test name" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/>
        <input className="study-input exam-input-subj" placeholder="Subject" value={subject}
          onChange={e => setSubject(e.target.value)}/>
        <input className="study-input exam-input-date" type="date" value={date}
          onChange={e => setDate(e.target.value)}/>
        <button className="study-add-btn exam-add-btn" onClick={add}>Add</button>
      </div>

      {loading ? <p className="study-empty">Loading…</p> : (
        <>
          {upcoming.length === 0 && (
            <p className="study-empty">No upcoming exams. Add one above.</p>
          )}
          <ul className="exam-list">
            {upcoming.map(exam => {
              const days = daysUntil(exam.date);
              return (
                <li key={exam.id} className={`exam-item ${urgencyClass(days)}`}>
                  <div className="exam-days-badge">
                    <span className="exam-days-num">{days}</span>
                    <span className="exam-days-lbl">day{days !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="exam-info">
                    <span className="exam-name">{exam.name}</span>
                    {exam.subject && <span className="exam-subject">{exam.subject}</span>}
                    <span className="exam-date">{new Date(exam.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <button className="study-delete-btn" onClick={() => remove(exam.id)}>✕</button>
                </li>
              );
            })}
          </ul>
          {past.length > 0 && (
            <details className="exam-past">
              <summary>{past.length} past exam{past.length > 1 ? 's' : ''}</summary>
              <ul className="exam-list exam-list-past">
                {past.map(exam => (
                  <li key={exam.id} className="exam-item exam-item-past">
                    <span className="exam-name">{exam.name}</span>
                    {exam.subject && <span className="exam-subject">{exam.subject}</span>}
                    <button className="study-delete-btn" onClick={() => remove(exam.id)}>✕</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function letterGrade(pct) {
  if (pct >= 97) return 'A+';
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A−';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B−';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C−';
  if (pct >= 67) return 'D+';
  if (pct >= 60) return 'D';
  return 'F';
}

function gradeColor(pct) {
  if (pct >= 90) return '#059669';
  if (pct >= 80) return '#2563eb';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

// Simple percent (no weighting)
function simpleAvg(items) {
  const total = items.reduce((s, e) => s + e.total, 0);
  const earned = items.reduce((s, e) => s + e.score, 0);
  return total > 0 ? (earned / total) * 100 : 0;
}

// Compute % for a single category — prefers direct points entry, falls back to items
function categoryPct(cat, items) {
  const earned = parseFloat(cat.pointsEarned);
  const max    = parseFloat(cat.pointsMax);
  if (!isNaN(earned) && !isNaN(max) && max > 0) {
    return (earned / max) * 100;
  }
  const catItems = items.filter(i => i.categoryId === cat.id);
  if (catItems.length > 0) return simpleAvg(catItems);
  return null;
}

// Weighted average using categories. If categories exist, uncategorized items are excluded.
function weightedAvg(items, cats) {
  if (cats.length === 0) return simpleAvg(items);
  let weightedSum = 0, totalWeight = 0;
  for (const c of cats) {
    const pct = categoryPct(c, items);
    if (pct === null) continue;
    weightedSum += pct * c.weight;
    totalWeight += c.weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function CategoryEditor({ user, subject: initialSubject, categories, onClose }) {
  const [subject, setSubject] = useState(initialSubject || '');
  const [rows, setRows] = useState(
    categories.length > 0
      ? categories.map(c => ({
          id: c.id, name: c.name, weight: String(c.weight),
          pointsEarned: c.pointsEarned != null ? String(c.pointsEarned) : '',
          pointsMax:    c.pointsMax    != null ? String(c.pointsMax)    : '',
        }))
      : [
          { id: null, name: 'Classwork & Homework', weight: '10', pointsEarned: '', pointsMax: '' },
          { id: null, name: 'Summative Assessments', weight: '90', pointsEarned: '', pointsMax: '' },
        ]
  );

  const totalWeight = rows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const valid =
    subject.trim().length > 0 &&
    Math.abs(totalWeight - 100) < 0.01 &&
    rows.every(r => r.name.trim());

  const update = (i, field, val) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };
  const addRow = () => setRows(prev => [...prev, { id: null, name: '', weight: '0', pointsEarned: '', pointsMax: '' }]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!valid || !user) return;
    const subj = subject.trim();
    const keptIds = new Set(rows.filter(r => r.id).map(r => r.id));
    await Promise.all(
      categories.filter(c => !keptIds.has(c.id))
        .map(c => deleteDoc(doc(db, 'users', user.uid, 'gradeCategories', c.id)))
    );
    await Promise.all(rows.map(r => {
      const earned = parseFloat(r.pointsEarned);
      const max    = parseFloat(r.pointsMax);
      const data = {
        subject: subj,
        name: r.name.trim(),
        weight: parseFloat(r.weight),
        pointsEarned: !isNaN(earned) ? earned : null,
        pointsMax:    !isNaN(max)    ? max    : null,
      };
      if (r.id) return updateDoc(doc(db, 'users', user.uid, 'gradeCategories', r.id), data);
      return addDoc(collection(db, 'users', user.uid, 'gradeCategories'), { ...data, createdAt: Date.now() });
    }));
    onClose();
  };

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal cat-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="cat-modal-header">
          <h3>{initialSubject ? `Edit ${initialSubject}` : 'New subject'}</h3>
          <button className="cat-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!initialSubject && (
          <label className="cat-subject-field">
            <span>Subject name</span>
            <input
              className="study-input"
              placeholder="e.g. Math"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <p className="cat-modal-hint">
          Add each grade category from Aeries. Weights must total 100%.
        </p>

        <div className="cat-rows">
          {rows.map((r, i) => {
            const pe = parseFloat(r.pointsEarned), pm = parseFloat(r.pointsMax);
            const showPct = !isNaN(pe) && !isNaN(pm) && pm > 0;
            const pct = showPct ? Math.round((pe / pm) * 1000) / 10 : null;
            return (
              <div key={i} className="cat-row">
                <div className="cat-row-top">
                  <input
                    className="study-input cat-name"
                    placeholder="Category name"
                    value={r.name}
                    onChange={e => update(i, 'name', e.target.value)}
                  />
                  <button className="cat-row-remove" onClick={() => removeRow(i)} aria-label="Remove">✕</button>
                </div>
                <div className="cat-row-bottom">
                  <label className="cat-field">
                    <span>Weight</span>
                    <div className="cat-field-input">
                      <input
                        className="study-input cat-weight"
                        type="number" min="0" max="100" step="0.1"
                        value={r.weight}
                        onChange={e => update(i, 'weight', e.target.value)}
                      />
                      <span className="cat-pct">%</span>
                    </div>
                  </label>
                  <label className="cat-field">
                    <span>Points</span>
                    <div className="cat-field-input">
                      <input
                        className="study-input cat-points"
                        type="number" min="0" step="0.01"
                        placeholder="105"
                        value={r.pointsEarned}
                        onChange={e => update(i, 'pointsEarned', e.target.value)}
                      />
                      <span className="cat-points-slash">/</span>
                      <input
                        className="study-input cat-points"
                        type="number" min="0" step="0.01"
                        placeholder="108"
                        value={r.pointsMax}
                        onChange={e => update(i, 'pointsMax', e.target.value)}
                      />
                    </div>
                  </label>
                  {showPct && (
                    <span className="cat-row-pct" style={{ color: gradeColor(pct) }}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button className="cat-add-row-btn" onClick={addRow}>+ Add category</button>
        <div className={`cat-total ${valid ? 'cat-total-ok' : 'cat-total-bad'}`}>
          Total weight: <strong>{Math.round(totalWeight * 10) / 10}%</strong>
          {!subject.trim() && <span className="cat-total-warn"> (subject name required)</span>}
          {subject.trim() && Math.abs(totalWeight - 100) > 0.01 && <span className="cat-total-warn"> (must equal 100%)</span>}
        </div>
        <div className="cat-modal-actions">
          <button className="cat-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cat-btn-primary" onClick={save} disabled={!valid}>Save</button>
        </div>
      </div>
    </div>
  );
}

function GradeTracker({ user }) {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [name,    setName]    = useState('');
  const [score,   setScore]   = useState('');
  const [total,   setTotal]   = useState('100');
  const [categoryId, setCategoryId] = useState('');
  const [editingCatsFor, setEditingCatsFor] = useState(null);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [planningFor, setPlanningFor] = useState(null);
  const [showAddRow, setShowAddRow] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsubGrades = onSnapshot(
      query(collection(db, 'users', user.uid, 'grades'), orderBy('createdAt', 'asc')),
      snap => { setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err => { console.error(err); setLoading(false); }
    );
    const unsubCats = onSnapshot(
      collection(db, 'users', user.uid, 'gradeCategories'),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error(err)
    );
    return () => { unsubGrades(); unsubCats(); };
  }, [user]);

  const subjectCats = (subj) => categories.filter(c => c.subject === subj);
  const currentSubjectCats = subjectCats(subject.trim());

  const add = async () => {
    const s = parseFloat(score), t = parseFloat(total);
    if (!subject.trim() || isNaN(s) || isNaN(t) || t === 0 || !user) return;
    await addDoc(collection(db, 'users', user.uid, 'grades'), {
      subject: subject.trim(), name: name.trim() || null,
      score: s, total: t,
      categoryId: categoryId || null,
      createdAt: Date.now(),
    });
    setSubject(''); setName(''); setScore(''); setTotal('100'); setCategoryId('');
  };

  const remove = (id) => deleteDoc(doc(db, 'users', user.uid, 'grades', id));
  const removeSubject = async (subj) => {
    if (!user) return;
    const gradesQuery = query(collection(db, 'users', user.uid, 'grades'), where('subject', '==', subj));
    const categoriesQuery = query(collection(db, 'users', user.uid, 'gradeCategories'), where('subject', '==', subj));
    const [gradeSnap, categorySnap] = await Promise.all([getDocs(gradesQuery), getDocs(categoriesQuery)]);
    await Promise.all([
      ...gradeSnap.docs.map(doc => deleteDoc(doc.ref)),
      ...categorySnap.docs.map(doc => deleteDoc(doc.ref)),
    ]);
    if (planningFor === subj) setPlanningFor(null);
    if (editingCatsFor === subj) setEditingCatsFor(null);
  };

  const grouped = entries.reduce((acc, e) => {
    (acc[e.subject] = acc[e.subject] || []).push(e);
    return acc;
  }, {});

  // Union of subjects from entries + categories (so subjects with categories but no items still render)
  const allSubjects = Array.from(new Set([
    ...Object.keys(grouped),
    ...categories.map(c => c.subject),
  ])).filter(Boolean);

  const overallPct = (() => {
    const valid = allSubjects
      .map(sub => weightedAvg(grouped[sub] || [], subjectCats(sub)))
      .filter(v => v > 0);
    return valid.length > 0
      ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length * 10) / 10
      : null;
  })();

  return (
    <div className="study-card grade-card">
      <div className="grade-header-row">
        <h2 className="study-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Grade Tracker
        </h2>
        {overallPct !== null && (
          <div className="grade-overall" style={{ color: gradeColor(overallPct) }}>
            <span className="grade-overall-pct">{overallPct}%</span>
            <span className="grade-overall-letter">{letterGrade(overallPct)}</span>
          </div>
        )}
      </div>

      <div className="grade-toolbar">
        <button className="grade-toolbar-btn grade-toolbar-btn-primary" onClick={() => setCreatingSubject(true)}>
          + New subject
        </button>
        <button className="grade-toolbar-btn" onClick={() => setShowAddRow(s => !s)}>
          {showAddRow ? '− Hide single assignment' : '+ Log a single assignment'}
        </button>
      </div>

      {showAddRow && (
        <div className="grade-add-row">
          <input className="study-input grade-input-subj" placeholder="Subject" value={subject}
            onChange={e => { setSubject(e.target.value); setCategoryId(''); }}/>
          <input className="study-input grade-input-name" placeholder="Assignment (optional)" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/>
          {currentSubjectCats.length > 0 && (
            <select className="study-input grade-input-cat" value={categoryId}
              onChange={e => setCategoryId(e.target.value)}>
              <option value="">Category…</option>
              {currentSubjectCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="grade-score-group">
            <input className="grade-input-score" placeholder="Score" type="number" min="0" value={score}
              onChange={e => setScore(e.target.value)}/>
            <span className="grade-slash">/</span>
            <input className="grade-input-total" placeholder="Total" type="number" min="1" value={total}
              onChange={e => setTotal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/>
          </div>
          <button className="study-add-btn grade-add-btn" onClick={add}>Add</button>
        </div>
      )}

      {loading ? <p className="study-empty">Loading…</p> : (
        allSubjects.length === 0
          ? <p className="study-empty">No subjects yet. Click "+ New subject" to set up your classes.</p>
          : (
            <div className="grade-groups">
              {allSubjects.map(subj => {
                const items = grouped[subj] || [];
                const cats  = subjectCats(subj);
                const avg   = Math.round(weightedAvg(items, cats) * 10) / 10;
                const hasCats = cats.length > 0;
                return (
                  <div key={subj} className="grade-group">
                    <div className="grade-group-header">
                      <span className="grade-group-name">{subj}</span>
                      <div className="grade-group-avg">
                        <span className="grade-bar-wrap">
                          <span className="grade-bar-fill" style={{ width: `${Math.min(avg, 100)}%`, background: gradeColor(avg) }}/>
                        </span>
                        <span className="grade-avg-pct" style={{ color: gradeColor(avg) }}>{avg}%</span>
                        <span className="grade-avg-letter" style={{ color: gradeColor(avg) }}>{letterGrade(avg)}</span>
                        <button className="grade-cat-btn" onClick={() => setPlanningFor(planningFor === subj ? null : subj)}
                          title="Plan final exam target">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                          </svg>
                        </button>
                        <button className="grade-cat-btn" onClick={() => setEditingCatsFor(subj)}
                          title={hasCats ? 'Edit categories & weights' : 'Set up weighted categories'}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                          </svg>
                        </button>
                        <button className="grade-cat-btn" onClick={() => removeSubject(subj)} title="Delete subject and all related grades/categories">
                          ✕
                        </button>
                      </div>
                    </div>
                    {planningFor === subj && (
                      <FinalPlanner currentPct={avg} />
                    )}
                    {hasCats ? (
                      <table className="grade-cat-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Weight</th>
                            <th>Points / Max</th>
                            <th>%</th>
                            <th>Mark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cats.map(c => {
                            const pct = categoryPct(c, items);
                            const hasDirect = c.pointsEarned != null && c.pointsMax != null;
                            return (
                              <tr key={c.id}>
                                <td className="grade-cat-row-name">{c.name}</td>
                                <td>{c.weight}%</td>
                                <td className="grade-cat-row-pts">
                                  {hasDirect
                                    ? <>{c.pointsEarned} / {c.pointsMax}</>
                                    : <span className="grade-cat-row-empty">not set</span>}
                                </td>
                                <td style={{ color: pct !== null ? gradeColor(pct) : '#9ca3af', fontWeight: 700 }}>
                                  {pct !== null ? `${Math.round(pct * 100) / 100}%` : ''}
                                </td>
                                <td style={{ color: pct !== null ? gradeColor(pct) : '#9ca3af', fontWeight: 700 }}>
                                  {pct !== null ? letterGrade(pct) : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p className="grade-no-cats">
                        No categories yet. Click the gear icon to set up weighted categories.
                      </p>
                    )}
                    {items.length > 0 && (
                      <details className="grade-items-details">
                        <summary>{items.length} individual assignment{items.length > 1 ? 's' : ''}</summary>
                        <ul className="grade-items">
                          {items.map(item => {
                            const pct = Math.round((item.score / item.total) * 1000) / 10;
                            const cat = cats.find(c => c.id === item.categoryId);
                            return (
                              <li key={item.id} className="grade-item">
                                <span className="grade-item-name">
                                  {item.name || 'Assignment'}
                                  {cat && <span className="grade-item-cat">{cat.name}</span>}
                                </span>
                                <span className="grade-item-score">{item.score}/{item.total}</span>
                                <span className="grade-item-pct" style={{ color: gradeColor(pct) }}>{pct}%</span>
                                <button className="study-delete-btn" onClick={() => remove(item.id)}>✕</button>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )
      )}

      {editingCatsFor && (
        <CategoryEditor
          user={user}
          subject={editingCatsFor}
          categories={subjectCats(editingCatsFor)}
          onClose={() => setEditingCatsFor(null)}
        />
      )}
      {creatingSubject && (
        <CategoryEditor
          user={user}
          subject={null}
          categories={[]}
          onClose={() => setCreatingSubject(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL PLANNER — inline per-subject "what do I need on the final?"
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_GRADES = [
  { label: 'A+ (97)', value: 97 },
  { label: 'A (93)',  value: 93 },
  { label: 'A− (90)', value: 90 },
  { label: 'B+ (87)', value: 87 },
  { label: 'B (83)',  value: 83 },
  { label: 'B− (80)', value: 80 },
  { label: 'C (73)',  value: 73 },
];

function FinalPlanner({ currentPct }) {
  const [finalWeight, setFinalWeight] = useState('20');
  const [target, setTarget] = useState('90');

  const cur = currentPct;
  const fw = parseFloat(finalWeight);
  const tgt = parseFloat(target);
  const valid = !isNaN(fw) && fw > 0 && fw <= 100 && !isNaN(tgt);
  const needed = valid ? (tgt - cur * (1 - fw / 100)) / (fw / 100) : null;

  let display, color = '#6b7280', note = null;
  if (needed === null) {
    display = '';
  } else if (needed > 100) {
    display = '>100%';
    color = '#dc2626';
    note = `Not reachable. Best possible: ${Math.round((cur * (1 - fw/100) + fw) * 10) / 10}%`;
  } else if (needed < 0) {
    display = '0%';
    color = '#059669';
    note = `Already locked in. Even 0% keeps you above target.`;
  } else {
    display = `${Math.round(needed * 10) / 10}%`;
    color = gradeColor(needed);
  }

  return (
    <div className="planner-row">
      <span className="planner-label">If final is</span>
      <input
        className="planner-input"
        type="number" min="1" max="100"
        value={finalWeight}
        onChange={e => setFinalWeight(e.target.value)}
      />
      <span className="planner-unit">% of grade, to get</span>
      <select className="planner-select" value={target} onChange={e => setTarget(e.target.value)}>
        {TARGET_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
      </select>
      <span className="planner-arrow">→</span>
      <span className="planner-result" style={{ color }}>{display}</span>
      {note && <span className="planner-note" style={{ color }}>{note}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Study({ setPage }) {
  const user = auth.currentUser;
  return (
    <div className="study-page">
      <div className="study-banner">
        <h1 className="study-title">Study Hub</h1>
      </div>
      <div className="study-content">
        <PomodoroTimer />
        <ExamCountdown user={user} />
        <GradeTracker user={user} />
      </div>
    </div>
  );
}