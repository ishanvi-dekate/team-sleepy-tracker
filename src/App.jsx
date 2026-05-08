import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase.js";
import { checkAndSendNotifications } from "./services/emailService.js";
import Nav from "./Components/Nav.jsx";
import Header from "./Components/Header.jsx";
import Home from "./Pages/Home.jsx";
import LoginPage from "./Pages/LoginPage.jsx";
import Login from "./Components/Login.jsx";
import Account from "./Pages/Account.jsx";
import Settings from "./Pages/Settings.jsx";
import Tracker from "./Pages/Tracker.jsx";
import Mental from "./Pages/Mental.jsx";
import Profile from "./Pages/Profile.jsx";
import Info from "./Pages/Info.jsx";
import ChatBot from "./Components/ChatBot.jsx";

const LOGIN_PAGES = ["LoginPage", "Login"];

// Cookies survive hard refresh (Ctrl+Shift+R); sessionStorage does not
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};
const setCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${30 * 86400}; SameSite=Strict`;
};
const deleteCookie = (name) => {
  document.cookie = `${name}=; path=/; max-age=0`;
};

function App() {
  const [page, setPage] = useState("LoginPage");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const saved = getCookie("page");
        const isNewUser = sessionStorage.getItem('isNewUser') === 'true';
        if (isNewUser) {
          sessionStorage.removeItem('isNewUser');
          setPage("Info");
        } else {
          setPage(saved && !LOGIN_PAGES.includes(saved) ? saved : "Home");
        }
        checkAndSendNotifications(firebaseUser);
      } else {
        deleteCookie("page");
        setPage("LoginPage");
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const navigateTo = (newPage) => {
    if (LOGIN_PAGES.includes(newPage)) {
      signOut(auth).catch(console.error);
      deleteCookie("page");
    } else {
      setCookie("page", newPage);
    }
    setPage(newPage);
  };

  if (authLoading) return null;

  // Pages that should show the Nav menu (after login)
  // "Todo" is excluded because Tracker.jsx includes Nav directly
  const showHeader = page !== "LoginPage" && page !== "Login" && page !== "Account" && page !== "Info";
  const showNav = showHeader && page !== "Home";
  return (
    <>
      {showHeader && <Header />}
      {page === "LoginPage" && <LoginPage setPage={navigateTo} />}
      {page === "Login" && <Login setPage={navigateTo} />}
      {page === "Account" && <Account setPage={navigateTo} />}
      {page === "Home" && <Home setPage={navigateTo} user={user} />}
      {page === "Settings" && <Settings setPage={navigateTo} />}
      {page === "Mental" && <Mental setPage={navigateTo} />}
      {page === "Profile" && <Profile setPage={navigateTo} />}
      {page === "Info" && <Info setPage={navigateTo} />}
      {page === "Todo" && <Tracker setPage={navigateTo} user={user} />}
      {showNav && <Nav setPage={navigateTo} currentPage={page} />}
      <ChatBot user={user} setPage={navigateTo} />
    </>
  );
}

export default App;