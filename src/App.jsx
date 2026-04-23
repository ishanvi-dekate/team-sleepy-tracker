import { useState } from "react";

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