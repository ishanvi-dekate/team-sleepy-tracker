import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import './SearchBar.css';

const PAGES = [
  { label: 'To-Do List',   page: 'Todo',     description: 'Manage your tasks and weekly planner' },
  { label: 'Mental State', page: 'Mental',   description: 'Track your mood and mental health' },
  { label: 'Profile',      page: 'Profile',  description: 'View your profile' },
  { label: 'Settings',     page: 'Settings', description: 'App settings' },
];

function SearchBar({ user, setPage }) {
  const [query, setQuery]   = useState('');
  const [todos, setTodos]   = useState([]);
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users', user.uid, 'todos')).then(snap => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const q = query.trim().toLowerCase();

  const pageResults = q
    ? PAGES.filter(p =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    : [];

  const todoResults = q
    ? todos.filter(t => t.text?.toLowerCase().includes(q)).slice(0, 6)
    : [];

  const hasResults = pageResults.length > 0 || todoResults.length > 0;

  const navigate = (dest) => {
    setPage(dest);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="search-bar" ref={containerRef}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search pages or tasks… ⌘K"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); setOpen(false); }}>✕</button>
        )}
      </div>

      {open && q && (
        <div className="search-dropdown">
          {!hasResults && (
            <p className="search-empty">No results for "<strong>{query}</strong>"</p>
          )}

          {pageResults.length > 0 && (
            <div className="search-group">
              <p className="search-group-label">Pages</p>
              {pageResults.map(p => (
                <button
                  key={p.page}
                  className="search-result"
                  onMouseDown={() => navigate(p.page)}
                >
                  <span className="search-result-icon">⊞</span>
                  <span className="search-result-text">
                    <span className="search-result-label">{p.label}</span>
                    <span className="search-result-desc">{p.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {todoResults.length > 0 && (
            <div className="search-group">
              <p className="search-group-label">Tasks</p>
              {todoResults.map(t => (
                <button
                  key={t.id}
                  className="search-result"
                  onMouseDown={() => navigate('Todo')}
                >
                  <span className="search-result-icon">{t.done ? '✓' : '○'}</span>
                  <span className="search-result-text">
                    <span className={`search-result-label ${t.done ? 'search-result-done' : ''}`}>
                      {t.text}
                    </span>
                    {t.date && <span className="search-result-desc">{t.date}{t.dueTime ? ` · ${t.dueTime}` : ''}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
