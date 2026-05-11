import './Nav.css';

const NAV_ICONS = {
  Home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 4l9 8v9a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1v-9z"/>
    </svg>
  ),
  Todo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2"/>
      <path d="M9 7h6M9 12l2 2 4-4"/>
    </svg>
  ),
  Mental: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 00-4 4c0 1.5.7 2.8.7 3.8V17a2 2 0 004 0v-7.2c0-1 .7-2.3.7-3.8a4 4 0 00-4-4z"/>
      <path d="M8 6C6 6 4 7.5 4 10c0 1.8.9 3.3 2.2 4"/>
      <path d="M16 6c2 0 4 1.5 4 4 0 1.8-.9 3.3-2.2 4"/>
    </svg>
  ),
  Study: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
  Profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M5 20a7 7 0 0114 0"/>
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-6.7-1.4 1.4M5.7 18.3l-1.4 1.4M18.3 18.3l-1.4-1.4M5.7 5.7 4.3 4.3"/>
    </svg>
  ),
};

function Nav({ setPage, currentPage }) {
  const navItems = [
    { label: 'Home',    target: 'Home' },
    { label: 'Tracker', target: 'Todo' },
    { label: 'Mental',  target: 'Mental' },
    { label: 'Study',   target: 'Study' },
    { label: 'Profile', target: 'Profile' },
    { label: 'Settings',target: 'Settings' },
  ];

  return (
    <nav className="app-nav">
      <ul className="app-nav-list">
        {navItems.map((item) => (
          <li
            key={item.target}
            className={`app-nav-item ${currentPage === item.target ? 'active' : ''}`}
            onClick={() => setPage(item.target)}
          >
            <span className="app-nav-icon">{NAV_ICONS[item.target]}</span>
            <span className="app-nav-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Nav;