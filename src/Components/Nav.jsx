import './nav.css';
import { useState } from 'react';

function Nav({ setPage }) {
  return (
    <footer>
      <div className='navibar'>
        <ul>
          <li onClick={() => setPage("login")}>Login</li>
          <li onClick={() => setPage("home")}>Home</li>
        </ul>
      </div>
    </footer>
  );
}

export default Nav