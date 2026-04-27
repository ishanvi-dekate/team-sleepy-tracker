import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './Header.css';

function Header({ user }) {
  return (
    <header className="header">
      <div className="header-left">
        <svg className="header-logo" width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#A78BFA" strokeWidth="1.5" opacity="0.4"/>
          <path d="M58 38 A14 14 0 1 0 64 56 A11 11 0 0 1 58 38 Z" fill="#A78BFA"/>
          <line x1="50" y1="50" x2="42" y2="58" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
        </svg>
        <div className="header-brand">
          <span className="header-name">efficient.epp</span>
          <span className="header-tag">explore your habits</span>
        </div>
      </div>    

      {user && (
        <div className="header-right">
          <span className="header-welcome">
            Hey, {user.displayName?.split(' ')[0] || 'there'}
          </span>
          <div
            className="header-avatar"
            onClick={() => signOut(auth)}
            title="Click to sign out"
          >
            {user.displayName
              ? user.displayName.split(' ').map(n => n[0]).join('')
              : 'e'}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;