import { useState, useEffect } from 'react';
import {auth, provider} from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
 
function GoogleLogin() {
  const [user, setUser] = useState(null);
 
  useEffect(() => {
	const unsub = onAuthStateChanged(auth, currentUser => setUser(currentUser));
	return () => unsub();
  }, []);
 
  return user ? (
	<div>
  	<p>Welcome, {user.displayName}</p>
  	<button onClick={() => signOut(auth)}>Log Out</button>
	</div>
  ) : (
	<button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button>
  );
}

