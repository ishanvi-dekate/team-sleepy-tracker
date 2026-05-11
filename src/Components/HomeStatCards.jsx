import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import './HomeStatCards.css';

function calcSleepHours(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return null;
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  const sleepMins = sh * 60 + (sm || 0);
  const wakeMins  = wh * 60 + (wm || 0);
  let diff = wakeMins - sleepMins;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function Sparkline({ data, yMin, yMax, color, yLabel, unit, gradId }) {
  const W = 260, H = 90, PX = 8, PY = 10;

  if (data.length === 0) {
    return (
      <div className="hsc-no-data">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 12h18M3 6l6 6-6 6"/>
        </svg>
        <span>Log a check-in to see your trend</span>
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="hsc-single">
        <span className="hsc-single-val">{data[0]}{unit}</span>
        <span className="hsc-single-lbl">first entry</span>
      </div>
    );
  }

  const lo = yMin ?? Math.min(...data);
  const hi = yMax ?? Math.max(...data);
  const range = hi - lo || 1;
  const n = data.length;

  const xs = data.map((_, i) => PX + (i / (n - 1)) * (W - PX * 2));
  const ys = data.map(v => PY + (1 - (v - lo) / range) * (H - PY * 2));
  const pts = xs.map((x, i) => [x, ys[i]]);

  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${xs[n-1].toFixed(1)} ${(H - PY).toFixed(1)} L ${xs[0].toFixed(1)} ${(H - PY).toFixed(1)} Z`;

  const latest = data[n - 1];

  return (
    <div className="hsc-chart-wrap">
      <div className="hsc-axis-y">{yLabel}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="hsc-svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i}
            x1={PX} y1={PY + t * (H - PY * 2)}
            x2={W - PX} y2={PY + t * (H - PY * 2)}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 3"
          />
        ))}
        <path d={areaPath} fill={`url(#${gradId})`}/>
        <path d={linePath} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={xs[n-1]} cy={ys[n-1]} r="4" fill={color} stroke="white" strokeWidth="1.5"/>
      </svg>
      <div className="hsc-axis-x-row">
        <span className="hsc-axis-x">Days</span>
        <span className="hsc-latest-badge" style={{ background: color }}>{latest}{unit}</span>
      </div>
    </div>
  );
}

export default function HomeStatCards({ user, setPage }) {
  const [checks, setChecks]     = useState([]);
  const [profile, setProfile]   = useState(null);
  const [distCount, setDistCount] = useState(0);
  const [pendingTodos, setPendingTodos] = useState(0);
  const [loading, setLoading]   = useState(true);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const [checksSnap, profileSnap, distSnap, todosSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', user.uid, 'mentalChecks'), orderBy('submittedAt', 'asc'))),
          getDoc(doc(db, 'users', user.uid)),
          getDocs(collection(db, 'users', user.uid, 'distractionLog')),
          getDocs(collection(db, 'users', user.uid, 'todos')),
        ]);
        setChecks(checksSnap.docs.map(d => d.data()));
        if (profileSnap.exists()) setProfile(profileSnap.data());
        setDistCount(distSnap.docs.filter(d => d.data().date === todayStr).length);
        setPendingTodos(todosSnap.docs.filter(d => {
          const td = d.data(); return td.date === todayStr && !td.done;
        }).length);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const stressData = checks.map(c => parseFloat(c.stressLevel)).filter(v => !isNaN(v) && v >= 1);
  const sleepData  = checks.map(c => calcSleepHours(c.sleepTime, c.wakeTime)).filter(h => h !== null && h > 0 && h <= 24);

  if (loading) {
    return (
      <section className="hsc-section">
        {[1,2,3].map(i => <div key={i} className="hsc-card hsc-card-skeleton"/>)}
      </section>
    );
  }

  return (
    <section className="hsc-section">

      {/* ── Stress ─────────────────────────────────────── */}
      <div className="hsc-card" onClick={() => setPage('Mental')} role="button" tabIndex={0}
           onKeyDown={e => e.key === 'Enter' && setPage('Mental')}>
        <h3 className="hsc-title">Stress</h3>
        <Sparkline
          data={stressData} yMin={1} yMax={5}
          color="#7C6FE8" yLabel="Stress level" unit="/5" gradId="hsc-grad-stress"
        />
      </div>

      {/* ── Time Management ────────────────────────────── */}
      <div className="hsc-card hsc-card--time" onClick={() => setPage('Todo')} role="button" tabIndex={0}
           onKeyDown={e => e.key === 'Enter' && setPage('Todo')}>
        <h3 className="hsc-title">Time Management</h3>
        <div className="hsc-stats">
          <div className="hsc-stat">
            <span className="hsc-stat-label">Hardest class</span>
            <span className="hsc-stat-val">{profile?.homeworkClass || '—'}</span>
          </div>
          <div className="hsc-stat">
            <span className="hsc-stat-label">Tasks left today</span>
            <span className={`hsc-stat-val hsc-num ${pendingTodos > 5 ? 'hsc-num--warn' : ''}`}>
              {pendingTodos}
            </span>
          </div>
          <div className="hsc-stat">
            <span className="hsc-stat-label">Distractions today</span>
            <span className={`hsc-stat-val hsc-num ${distCount > 3 ? 'hsc-num--warn' : 'hsc-num--ok'}`}>
              {distCount}
            </span>
          </div>
        </div>
        {profile?.courses && (
          <div className="hsc-courses">
            {profile.courses.split(/[,\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 4).map((c, i) => (
              <span key={i} className="hsc-course-pill">{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Sleep ──────────────────────────────────────── */}
      <div className="hsc-card" onClick={() => setPage('Mental')} role="button" tabIndex={0}
           onKeyDown={e => e.key === 'Enter' && setPage('Mental')}>
        <h3 className="hsc-title">Sleep</h3>
        <Sparkline
          data={sleepData} yMin={0} yMax={12}
          color="#1E40AF" yLabel="Hours slept" unit="h" gradId="hsc-grad-sleep"
        />
      </div>

    </section>
  );
}
