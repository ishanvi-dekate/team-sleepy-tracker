import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import './Account.css';

function Account({ setPage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Mark this as a new user so App.jsx knows to send them to Info, not Home
      sessionStorage.setItem('isNewUser', 'true');
      setPage('Info');
    } catch (err) {
      // Firebase gives detailed error codes; show a friendly message
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Try a stronger one.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error(err);
    }
  };

  return (
    <main className="account-page">
      <section className="account-card">
        <h1>Sign Up</h1>
        <p>Sign up to start using efficient.epp.</p>

        {error && <p className="account-error">{error}</p>}

        <form onSubmit={handleSubmit} className="account-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
            />
          </label>

          <button type="submit" className="account-submit-btn">
            Sign Up
          </button>
        </form>

        <button
          type="button"
          className="account-back-btn"
          onClick={() => setPage('Login')}
        >
          Already have an account? Log in
        </button>
      </section>
    </main>
  );
}

export default Account;