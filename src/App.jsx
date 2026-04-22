import { useState } from "react";
import { Nav } from "./compoents/Nav.jsx";
import {Home} from "./Pages/Home.jsx";
import {ToDo} from "./Pages/Todo.jsx";
import {Mental} from "./Pages/Mental.jsx";
import {Profile} from "./Pages/Profile.jsx";
import {Settings} from "./Pages/Settings.jsx";
function App(){
    const [page, setPage] = useState("main")
    return(
        <>
        <Nav setPage={setPage}/>
        {page === "home" && <Home /> }
        {page === "todo" && <ToDo />}
        {page === "mental" && <Mental />}
        {page === "profile" && <Profile />}
        {page === "settings" && <Settings />}
        </>)}
export default App