import { useState } from "react";
import "./Login.css";

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.08-6.08C34.46 3.09 29.52 1 24 1 14.82 1 7.07 6.44 3.74 14.09l7.09 5.51C12.53 13.35 17.83 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.98-2.22 5.5-4.73 7.2l7.28 5.65C43.36 37.54 46.52 31.5 46.52 24.5z"/>
    <path fill="#FBBC05" d="M10.83 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.28-3.15.77-4.6L3.18 13.9A23.94 23.94 0 0 0 0 24c0 3.84.9 7.47 2.5 10.69l8.33-6.09z"/>
    <path fill="#34A853" d="M24 47c5.52 0 10.16-1.82 13.55-4.95l-7.28-5.65c-1.82 1.23-4.16 1.95-6.27 1.95-6.17 0-11.47-3.85-13.17-9.1l-7.09 5.51C7.07 41.56 14.82 47 24 47z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

const Stars = () => {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="stars-container">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

const planets = [
  {
    id: "asteroid-left",
    top: "8%",
    left: "7%",
    size: 90,
    animDelay: "0s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g1" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#6b6b6b" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g1)" />
        <ellipse cx="35" cy="62" rx="10" ry="7" fill="#555" opacity="0.5" />
        <ellipse cx="60" cy="40" rx="7" ry="5" fill="#555" opacity="0.4" />
        <ellipse cx="70" cy="68" rx="6" ry="4" fill="#555" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: "red-planet",
    top: "28%",
    left: "18%",
    size: 80,
    animDelay: "1s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g2" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ff8c42" />
            <stop offset="100%" stopColor="#c0392b" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g2)" />
        <ellipse cx="50" cy="50" rx="46" ry="12" fill="#b03a2e" opacity="0.4" />
        <ellipse cx="50" cy="58" rx="44" ry="10" fill="#922b21" opacity="0.3" />
        <ellipse cx="50" cy="66" rx="38" ry="8" fill="#922b21" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: "meteor",
    top: "10%",
    left: "52%",
    size: 70,
    animDelay: "0.5s",
    element: (
      <svg viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="130" cy="40" rx="25" ry="22" fill="#555" />
        <circle cx="130" cy="40" r="22" fill="#4a4a4a" />
        <ellipse cx="122" cy="48" rx="5" ry="3.5" fill="#333" opacity="0.6" />
        <ellipse cx="90" cy="38" rx="40" ry="8" fill="#ff6b35" opacity="0.85" />
        <ellipse cx="65" cy="37" rx="28" ry="5" fill="#ff9500" opacity="0.7" />
        <ellipse cx="42" cy="36" rx="18" ry="3.5" fill="#ffcc00" opacity="0.6" />
        <ellipse cx="24" cy="36" rx="10" ry="2" fill="#fff" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "jupiter",
    top: "6%",
    right: "7%",
    size: 100,
    animDelay: "1.5s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g3" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#e8c9a0" />
            <stop offset="100%" stopColor="#c8a060" />
          </radialGradient>
          <clipPath id="clip1"><circle cx="50" cy="50" r="46" /></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g3)" />
        <g clipPath="url(#clip1)">
          <rect x="0" y="30" width="100" height="7" fill="#d4956a" opacity="0.7" />
          <rect x="0" y="42" width="100" height="5" fill="#b87050" opacity="0.5" />
          <rect x="0" y="52" width="100" height="9" fill="#cc8855" opacity="0.6" />
          <rect x="0" y="66" width="100" height="5" fill="#b87050" opacity="0.4" />
          <ellipse cx="62" cy="56" rx="10" ry="7" fill="#c0392b" opacity="0.8" />
        </g>
      </svg>
    ),
  },
  {
    id: "blue-planet",
    top: "55%",
    left: "8%",
    size: 75,
    animDelay: "2s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g4" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#2980b9" />
            <stop offset="100%" stopColor="#1a5276" />
          </radialGradient>
          <clipPath id="clip2"><circle cx="50" cy="50" r="46" /></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g4)" />
        <g clipPath="url(#clip2)">
          <rect x="0" y="35" width="100" height="5" fill="#1a6a9a" opacity="0.5" />
          <rect x="0" y="50" width="100" height="5" fill="#145a8a" opacity="0.4" />
          <ellipse cx="40" cy="45" rx="8" ry="4" fill="#1a3a6a" opacity="0.3" />
        </g>
      </svg>
    ),
  },
  {
    id: "moon",
    top: "65%",
    left: "28%",
    size: 65,
    animDelay: "2.5s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g5" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#d4d4d4" />
            <stop offset="100%" stopColor="#9a9a9a" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g5)" />
        <circle cx="38" cy="40" r="7" fill="#888" opacity="0.25" />
        <circle cx="60" cy="55" r="5" fill="#888" opacity="0.2" />
        <circle cx="44" cy="62" r="4" fill="#888" opacity="0.2" />
        <circle cx="65" cy="35" r="3" fill="#888" opacity="0.15" />
      </svg>
    ),
  },
  {
    id: "teal-planet",
    top: "42%",
    right: "8%",
    size: 85,
    animDelay: "0.8s",
    element: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g6" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#76d7c4" />
            <stop offset="100%" stopColor="#1a8a75" />
          </radialGradient>
          <clipPath id="clip3"><circle cx="50" cy="50" r="46" /></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#g6)" />
        <g clipPath="url(#clip3)">
          <rect x="0" y="40" width="100" height="5" fill="#148a75" opacity="0.3" />
          <rect x="0" y="55" width="100" height="4" fill="#0e7a66" opacity="0.25" />
        </g>
      </svg>
    ),
  },
  {
    id: "saturn-like",
    top: "72%",
    right: "5%",
    size: 80,
    animDelay: "3s",
    element: (
      <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g7" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#d4b896" />
            <stop offset="100%" stopColor="#a0785a" />
          </radialGradient>
          <clipPath id="clip4"><circle cx="60" cy="50" r="36" /></clipPath>
        </defs>
        <ellipse cx="60" cy="56" rx="55" ry="12" fill="none" stroke="#a07850" strokeWidth="8" opacity="0.4" />
        <circle cx="60" cy="50" r="36" fill="url(#g7)" />
        <g clipPath="url(#clip4)">
          <rect x="20" y="40" width="80" height="5" fill="#8a6040" opacity="0.4" />
          <rect x="20" y="52" width="80" height="4" fill="#8a6040" opacity="0.3" />
        </g>
        <ellipse cx="60" cy="56" rx="55" ry="12" fill="none" stroke="#c09870" strokeWidth="4" opacity="0.3" />
      </svg>
    ),
  },
];

export default function Login({ onLogin }) {
  const [view, setView] = useState("home");

  const handleGoogleLogin = () => {
    if (onLogin) onLogin({ provider: "google" });
    alert("Google OAuth flow would start here!");
  };

  return (
    <div className="login-root">
      <div className="hero">
        <Stars />

        {planets.map((p) => (
          <div
            key={p.id}
            className="planet"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.id === "meteor" ? p.size * 0.5 : p.size,
              animationDelay: p.animDelay,
              animationDuration: p.id === "meteor" ? "8s" : "6s",
            }}
          >
            {p.element}
          </div>
        ))}

        <div className="hero-content">
          <div className="app-title">efficient.epp</div>
          <div className="app-subtitle">expLore YoUr HaBits</div>
          <div className="tagline">
            Get in charge of your<br />
            assignments, activities<br />
            and sleep!
          </div>
          <button className="hero-cta" onClick={() => setView("login")}>
            Press this button to hop<br />on through Google!
          </button>
        </div>
      </div>

      <div className="hero-footer">
        2026 All rights reserved to E Group LLC
      </div>

      <div className="login-area">
        {view === "home" ? (
          <p className="login-hint">
            Click the button above to sign in
          </p>
        ) : (
          <>
            <div className="login-label">Google login</div>
            <div className="login-card">
              <div className="google-login-row">
                <GoogleIcon />
                <span>Login</span>
              </div>
              <button className="card-btn" onClick={handleGoogleLogin}>
                Sign In
              </button>
              <button
                className="card-btn card-btn-alt"
                onClick={handleGoogleLogin}
              >
                Create Account
              </button>
            </div>
            <span className="back-link" onClick={() => setView("home")}>
              &larr; Back
            </span>
          </>
        )}
      </div>
    </div>
  );
}