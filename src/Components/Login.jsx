import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);

 

  const fetchMessages = async () => {
    const snapshot = await getDocs(collection(db, 'messages')); // Get all documents
    const list = snapshot.docs.map(doc => doc.data()); // Convert docs to plain JS objects
    setMessages(list); // Update the messages state
  };

  // Add a new message to Firestore
  const sendMessage = async () => {
    if (!input.trim()) return; // Don't send empty messages

    // Add a new message with the user's name and current timestamp
    await addDoc(collection(db, 'messages'), {
      text: input,
      name: user.displayName,
      timestamp: Date.now()
    });

    setInput(''); // Clear the input field
    fetchMessages(); // Refresh the message list after sending
  };

  // Re-fetch messages any time the user logs in
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);


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
    onLogin?.();}


  return (
    <>
    <></>
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
          
        </form>
      </section>
    </main>
    </>
  );
};
export default Login
