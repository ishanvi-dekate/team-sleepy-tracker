import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import SearchBar from "../Components/SearchBar";
import HomeStatCards from "../Components/HomeStatCards";
import "./Home.css";

const GRAPH_COLOR = '#1E3A8A';

function parseSleepHours(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return null;
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let diff = (wh * 60 + wm) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  const h = diff / 60;
  return (h < 1 || h > 16) ? null : Math.round(h * 10) / 10;
}

function Sparkline({ data, minY = 0, maxY }) {
  const W = 180, H = 52, P = 5;
  if (!data || data.length < 2) {
    return <p className="hg-empty">Complete a Mental Check to see your trend</p>;
  }
  const hi = maxY ?? Math.max(...data);
  const lo = minY;
  const rng = (hi - lo) || 1;
  const px = i => P + (i / (data.length - 1)) * (W - P * 2);
  const py = v => H - P - ((v - lo) / rng) * (H - P * 2);
  const pts = data.map((v, i) => [px(i), py(v)]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H}Z`;
  return (
    <svg className="hg-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={area} fill={GRAPH_COLOR} opacity="0.15" />
      <path d={line} fill="none" stroke={GRAPH_COLOR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill={GRAPH_COLOR} />)}
    </svg>
  );
}

function BarChart({ data, maxY }) {
  const W = 180, H = 52, P = 5;
  if (!data || data.length === 0) {
    return <p className="hg-empty">Complete a Mental Check to see your sleep data</p>;
  }
  const hi = maxY ?? Math.max(...data, 1);
  const n = data.length;
  const slot = (W - P * 2) / n;
  const bw = slot * 0.6;
  return (
    <svg className="hg-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = Math.max(3, (v / hi) * (H - P * 2));
        return (
          <rect
            key={i}
            x={P + i * slot + (slot - bw) / 2}
            y={H - P - bh}
            width={bw}
            height={bh}
            rx="2"
            fill={GRAPH_COLOR}
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

function DonutProgress({ done, total }) {
  const R = 26, CX = 36, CY = 36, SW = 7;
  const circ = 2 * Math.PI * R;
  const pct = total > 0 ? done / total : 0;
  const dash = (pct * circ).toFixed(2);
  return (
    <div className="hg-donut-wrap">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={GRAPH_COLOR} strokeWidth={SW} opacity="0.2" />
        <circle
          cx={CX} cy={CY} r={R} fill="none" stroke={GRAPH_COLOR} strokeWidth={SW}
          strokeDasharray={`${dash} ${circ.toFixed(2)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <text x={CX} y={CY} textAnchor="middle" dy="0.35em" fontSize="12" fontWeight="700" fill="#1F2937">
          {total > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </text>
      </svg>
      <div className="hg-donut-text">
        <span className="hg-donut-count">{done}/{total}</span>
        <span className="hg-donut-label">done this week</span>
      </div>
    </div>
  );
}

function Home({ setPage, user }) {
  const [username, setUsername] = useState(user?.displayName || "");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid))
      .then(snap => {
        if (snap.exists() && snap.data().username) {
          setUsername(snap.data().username);
        } else if (user.displayName) {
          setUsername(user.displayName);
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <main className="home-page">
      <div className="home-banner">
        <div className="home-banner-bg" />
        <h2 className="home-title">Welcome Back, {username}</h2>
        <SearchBar user={user} setPage={setPage} />
      </div>

      <HomeStatCards user={user} setPage={setPage} />

      <section className="home-icons">
        {/* To-Do */}
        <button className="icon-btn icon-btn-purple" onClick={() => setPage('Todo')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="14" y="10" width="36" height="46" rx="3"/>
              <path d="M22 22 l4 4 l8 -8"/>
              <line x1="38" y1="22" x2="44" y2="22"/>
              <path d="M22 36 l4 4 l8 -8"/>
              <line x1="38" y1="36" x2="44" y2="36"/>
              <line x1="22" y1="50" x2="34" y2="50"/>
            </svg>
          </div>
          <span className="icon-label">To-Do</span>
        </button>

        {/* Study Hub */}
        <button className="icon-btn icon-btn-teal" onClick={() => setPage('Study')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10 h20 a8 8 0 018 8 v32 a6 6 0 00-6-6 H8z"/>
              <path d="M56 10 H36 a8 8 0 00-8 8 v32 a6 6 0 016-6 h22z"/>
            </svg>
          </div>
          <span className="icon-label">Study Hub</span>
        </button>

        {/* Mental State */}
        <button className="icon-btn icon-btn-blue" onClick={() => setPage('Mental')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16 C16 16 12 20 12 26 C12 30 14 32 14 34 C12 36 12 40 14 42 C13 45 14 48 17 50 C18 52 22 54 26 52 L26 16 C25 14 24 16 22 16 Z"/>
              <path d="M42 16 C48 16 52 20 52 26 C52 30 50 32 50 34 C52 36 52 40 50 42 C51 45 50 48 47 50 C46 52 42 54 38 52 L38 16 C39 14 40 16 42 16 Z"/>
              <line x1="32" y1="20" x2="32" y2="50"/>
            </svg>
          </div>
          <span className="icon-label">Mental State</span>
        </button>

        {/* Profile */}
        <button className="icon-btn icon-btn-pink" onClick={() => setPage('Profile')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="32" cy="22" r="10"/>
              <path d="M14 54 C14 44 22 38 32 38 C42 38 50 44 50 54"/>
            </svg>
          </div>
          <span className="icon-label">Profile</span>
        </button>

        {/* Settings */}
        <button className="icon-btn icon-btn-orange" onClick={() => setPage('Settings')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="32" cy="32" r="6"/>
              <path d="M32 8 L32 14 M32 50 L32 56 M8 32 L14 32 M50 32 L56 32 M15 15 L19 19 M45 45 L49 49 M15 49 L19 45 M45 19 L49 15"/>
              <circle cx="32" cy="32" r="14"/>
            </svg>
          </div>
          <span className="icon-label">Settings</span>
        </button>
      </section>
    </main>
  );
}

export default Home;
