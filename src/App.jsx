import { useState } from "react";
import Nav from "./Components/Nav.jsx";
import Home from "./Pages/Home.jsx";
import LoginPage from "./Pages/Loginpage.jsx";

function App() {
    const [page, setPage] = useState("LoginPage");

    return (
        <>
        <Nav setPage={setPage} />
            {page === "LoginPage" && <LoginPage />}
            {page === "Home" && <Home />}
        </>
    );
}

export default App