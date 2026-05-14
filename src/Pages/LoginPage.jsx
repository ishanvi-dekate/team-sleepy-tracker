import './LoginPage.css';

function LoginPage({ setPage }) {
  return (
    <div className="login-root">
      <section className="hero">
        <div className="planets-wrap" aria-hidden="true">
          {/* Top-left gray cratered moon */}
          <svg className="planet planet-1" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#9CA3AF"/>
            <circle cx="40" cy="45" r="8" fill="#6B7280" opacity="0.7"/>
            <circle cx="75" cy="40" r="5" fill="#6B7280" opacity="0.7"/>
            <circle cx="80" cy="70" r="10" fill="#6B7280" opacity="0.7"/>
            <circle cx="45" cy="80" r="6" fill="#6B7280" opacity="0.7"/>
            <circle cx="55" cy="60" r="4" fill="#6B7280" opacity="0.5"/>
          </svg>

          {/* Orange-striped Jupiter-like planet (top-left of center) */}
          <svg className="planet planet-2" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="lp-jup1">
                <circle cx="60" cy="60" r="50"/>
              </clipPath>
            </defs>
            <g clipPath="url(#lp-jup1)">
              <rect x="10" y="10" width="100" height="100" fill="#FCD34D"/>
              <rect x="10" y="30" width="100" height="8" fill="#F97316"/>
              <rect x="10" y="50" width="100" height="10" fill="#DC2626"/>
              <rect x="10" y="70" width="100" height="6" fill="#F97316"/>
              <rect x="10" y="85" width="100" height="8" fill="#FB923C"/>
            </g>
          </svg>

          {/* Comet/shooting star (top middle-right) */}
          <svg className="planet planet-comet" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 70 Q 80 50 160 30" stroke="#FED7AA" strokeWidth="6" fill="none" opacity="0.7" strokeLinecap="round"/>
            <path d="M 20 75 Q 90 55 165 32" stroke="#FCA5A5" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round"/>
            <circle cx="165" cy="32" r="18" fill="#F97316"/>
            <circle cx="165" cy="32" r="12" fill="#FBBF24"/>
            <circle cx="160" cy="28" r="4" fill="#6B7280" opacity="0.6"/>
          </svg>

          {/* Top-right Jupiter with red spot */}
          <svg className="planet planet-3" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="lp-jup2">
                <circle cx="60" cy="60" r="50"/>
              </clipPath>
            </defs>
            <g clipPath="url(#lp-jup2)">
              <rect x="10" y="10" width="100" height="100" fill="#FCD34D"/>
              <rect x="10" y="35" width="100" height="6" fill="#F97316"/>
              <rect x="10" y="55" width="100" height="8" fill="#FB923C"/>
              <rect x="10" y="75" width="100" height="6" fill="#F97316"/>
              <ellipse cx="80" cy="60" rx="10" ry="6" fill="#DC2626"/>
            </g>
          </svg>

          {/* Left blue planet */}
          <svg className="planet planet-4" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#3B82F6"/>
            <path d="M 15 50 Q 60 40 105 50" stroke="#1E3A8A" strokeWidth="3" fill="none" opacity="0.5"/>
            <path d="M 15 70 Q 60 80 105 70" stroke="#1E3A8A" strokeWidth="2" fill="none" opacity="0.5"/>
            <circle cx="40" cy="55" r="3" fill="#1E3A8A" opacity="0.4"/>
            <circle cx="75" cy="75" r="2" fill="#1E3A8A" opacity="0.4"/>
          </svg>

          {/* Right teal planet */}
          <svg className="planet planet-5" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#5EEAD4"/>
            <path d="M 15 45 Q 60 35 105 45" stroke="#0F766E" strokeWidth="4" fill="none" opacity="0.4"/>
            <path d="M 15 70 Q 60 80 105 70" stroke="#0F766E" strokeWidth="3" fill="none" opacity="0.3"/>
            <circle cx="80" cy="55" r="4" fill="#0F766E" opacity="0.3"/>
          </svg>

          {/* Bottom moon */}
          <svg className="planet planet-6" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="50" fill="#D1D5DB"/>
            <circle cx="42" cy="48" r="7" fill="#9CA3AF" opacity="0.7"/>
            <circle cx="75" cy="55" r="5" fill="#9CA3AF" opacity="0.7"/>
            <circle cx="55" cy="78" r="9" fill="#9CA3AF" opacity="0.7"/>
            <circle cx="80" cy="80" r="4" fill="#9CA3AF" opacity="0.6"/>
          </svg>

          {/* Bottom-right striped planet */}
          <svg className="planet planet-7" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="lp-stripe">
                <circle cx="60" cy="60" r="50"/>
              </clipPath>
            </defs>
            <g clipPath="url(#lp-stripe)">
              <rect x="10" y="10" width="100" height="100" fill="#92400E"/>
              <rect x="10" y="30" width="100" height="8" fill="#FCD34D"/>
              <rect x="10" y="48" width="100" height="6" fill="#5EEAD4"/>
              <rect x="10" y="62" width="100" height="8" fill="#FCD34D"/>
              <rect x="10" y="78" width="100" height="6" fill="#5EEAD4"/>
            </g>
          </svg>
        </div>

        <div className="hero-content">
          <h1 className="app-title">efficient.epp</h1>
          <h2 className="app-subtitle">expLore YoUr HaBits</h2>
          <p className="tagline">
            Get in charge of your<br />
            assignments, activities<br />
            and sleep!
          </p>
          <button
            className="hero-cta"
            onClick={() => setPage('Login')}
          >
            Hop on through Google!
          </button>
        </div>
      </section>

      <footer className="hero-footer">
        2026 All rights reserved to E Group LLC
      </footer>
    </div>
  );
}

export default LoginPage;