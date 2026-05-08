import Card from "../Components/Card";
import SearchBar from "../Components/SearchBar";
import "./Home.css";

function Home({ setPage, user }) {
  return (
    <main className="home-page">
      <div className="home-banner">
        <h2 className="home-title">Welcome Back, {user?.displayName || user?.email || ""}</h2>
        <SearchBar user={user} setPage={setPage} />
      </div>

      <section className="home-cards">
        <Card title="Stress" className="home-card">
          Track your stress levels over time.
        </Card>
        <Card title="Time Management + Homework" className="home-card">
          Stay on top of your assignments.
        </Card>
        <Card title="Sleep" className="home-card">
          Monitor your sleep patterns.
        </Card>
      </section>

      <section className="home-icons">
        {/* To-Do: Checklist icon */}
        <button className="icon-btn icon-btn-purple" onClick={() => setPage('Todo')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Mental State: Brain icon */}
        <button className="icon-btn icon-btn-blue" onClick={() => setPage('Mental')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16 C16 16 12 20 12 26 C12 30 14 32 14 34 C12 36 12 40 14 42 C13 45 14 48 17 50 C18 52 22 54 26 52 L26 16 C25 14 24 16 22 16 Z"/>
              <path d="M42 16 C48 16 52 20 52 26 C52 30 50 32 50 34 C52 36 52 40 50 42 C51 45 50 48 47 50 C46 52 42 54 38 52 L38 16 C39 14 40 16 42 16 Z"/>
              <line x1="32" y1="20" x2="32" y2="50"/>
            </svg>
          </div>
          <span className="icon-label">Mental State</span>
        </button>

        {/* Profile: Person icon */}
        <button className="icon-btn icon-btn-pink" onClick={() => setPage('Profile')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="32" cy="22" r="9"/>
              <path d="M14 54 C14 44 22 38 32 38 C42 38 50 44 50 54"/>
            </svg>
          </div>
          <span className="icon-label">Profile</span>
        </button>

        {/* Settings: Gear icon */}
        <button className="icon-btn icon-btn-orange" onClick={() => setPage('Settings')}>
          <div className="icon-circle">
            <svg className="icon-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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