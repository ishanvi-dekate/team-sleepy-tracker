import { useState } from "react";
import Nav from "./Components/Nav.jsx";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";

function App() {
    const [page, setPage] = useState("login");

    return (
        <>
            <Nav setPage={setPage} />
            {page === "login" && <Login onLogin={() => setPage("home")} />}
            {page === "home" && <Home />}
        </>
    );
}

export default App