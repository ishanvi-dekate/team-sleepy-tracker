import './nav.css'
import { useState } from 'react'

function Nav({setPage}){
    return(
        <footer><div className='navibar'>
            <ul>
                <li onClick={() => setPage("home")}>home</li>
                <li onClick={() => setPage("todo")}>To-Do list</li>
                <li onClick={() => setPage("mental")}>Mental</li>
                <li onClick={() => setPage("profile")}>Profile</li>
                <li onClick={() => setPage("settings")}>Settings</li>
            </ul>
        </div>
        </footer>
    )
}
export default Nav