import './nav.css';
import { useState } from 'react';

function Nav({ setPage }) {
  return (
    <footer>
      <div className='navibar'>
        <ul>
          <li onClick={() => setPage("login")}>Login</li>
          <li onClick={() => setPage("home")}>Home</li>
          <li onClick={() => setPage("todo")}>To-Do</li>
          <li onClick={() => setPage("mental")}>Mental Stae</li>
          <li onClick={() => setPage("settings")}>Settings</li>
          <li onClick= {() => setPage("profile")}>Profile</li>
          <li onClick= {()=> setPage("sign-out")}>Sign-Out</li>
        </ul>
      </div>
    </footer>
  );
}

export default Nav