// Import React hooks and Firebase functionality
import { useEffect, useState } from 'react';
import { db, auth, provider } from 'team-efficient-epp\src\firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'; // Auth methods
import { collection, getDocs } from 'firebase/firestore'; // Firestore methods

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    onLogin?.();
  };

  return (
    <>
    <div>
      {/* If user is logged in, show greeting, logout button, and messages */}
      {user ? (
        <div>
          <h2>Hello! Welcome to efficient.epp! Ready to track your schedule, {user.displayName}?</h2>
          <button onClick={handleLogout}>Log Out</button>

          <ul>
            {messages.map((msg, i) => (
              <li key={i}>
                <strong>{msg.name || 'Anon'}:</strong> {msg.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // If no user is logged in, show login button
        <div>
          <button onClick={handleLogin}>Login with Google</button>
          <p>Please login with your personal account!</p>
        </div>
      )}
    </div>
    
    <main className="login-page">
      <section className="login-card">
        <h1>Login</h1>
        <p>Sign in to continue using efficient.epp.</p>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
            />
          </label>

          <button type="submit">Log In</button>
        </form>
      </section>
    </main>
    </>
  );
}
export default Login
