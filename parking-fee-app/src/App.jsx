import { useState, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { FeeCalculatorPage } from "./pages/FeeCalculatorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ParkingActivePage } from "./pages/ParkingActivePage";
import { NotificationToast } from "./components/NotificationToast";
import { getActiveSession } from "./lib/sessionStorage";

function App() {
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      setHasActiveSession(!!getActiveSession());
    };
    checkSession();
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <main>
        <header>
          <h1>駐車料金計算アプリ</h1>

          <nav>
            <Link to="/">ホーム</Link>
            {" / "}
            <Link to="/calculator">料金計算</Link>
            {" / "}
            <Link to="/parking" style={{ fontWeight: hasActiveSession ? "bold" : "normal", color: hasActiveSession ? "#c62828" : undefined }}>
              {hasActiveSession ? "🔴 駐車中" : "駐車中"}
            </Link>
            {" / "}
            <Link to="/settings">設定</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculator" element={<FeeCalculatorPage />} />
          <Route path="/parking" element={<ParkingActivePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>

        {/* リアルタイム通知トースト */}
        <NotificationToast />
      </main>
    </BrowserRouter>
  );
}

export default App;