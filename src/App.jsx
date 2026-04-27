import { useState } from "react";
import Nav from "./Components/Nav.jsx";
import Home from "./Pages/Home.jsx";
import StarterPage from "./Pages/StarterPage.jsx";

function App() {
    const [page, setPage] = useState("StarterPage");

    return (
        <>
        <Nav setPage={setPage} />
            {page === "StarterPage" && <StarterPage />}
            {page === "Home" && <Home />}
        </>
    );
}

export default App