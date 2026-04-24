// Import React hooks and Firebase functionality
import { useEffect, useState } from 'react';
import { db, auth, provider } from './firebase'; // Custom Firebase config
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'; // Auth methods
import { collection, getDocs } from 'firebase/firestore'; // Firestore methods

function GoogleLogin() {
  // State to hold the logged-in user
  const [user, setUser] = useState(null);

  // State to hold messages from Firestore
  const [messages, setMessages] = useState([]);

  // Monitor authentication status (e.g., login/logout) in real time
  useEffect(() => {
    // Set up a listener that triggers every time the auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Update the user state with the logged-in user
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Handle Google login using a popup window
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider); // Triggers Google login flow
    } catch (error) {
      console.error('Login failed', error); // Catch and display any login errors
    }
  };

  // Handle logout for the authenticated user
  const handleLogout = async () => {
    try {
      await signOut(auth); // Signs out the current user
      setUser(null); // Clear the user from local state
    } catch (error) {
      console.error('Logout failed', error); // Catch and display logout errors
    }
  };

  // Fetch all messages from the "messages" collection in Firestore
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

  // UI rendering
  return (
    <div>
      {/* If user is logged in, show greeting, logout button, and messages */}
      {user ? (
        <div>
          <h2>Hello! {user.displayName}</h2>
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
        </div>
      )}
    </div>
  );
}
export default GoogleLogin;