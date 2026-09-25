import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { FeeCalculatorPage } from "./pages/FeeCalculatorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ParkingActivePage } from "./pages/ParkingActivePage";
import { ParkingMapPage } from "./pages/ParkingMapPage";
import { PhotoOcrPage } from "./pages/PhotoOcrPage";
import { NotificationToast } from "./components/NotificationToast";

function App() {
  return (
    <BrowserRouter>
      <main>
        <header>
          <h1>駐車料金計算アプリ</h1>

          <nav className="bottom-navigation" aria-label="メインメニュー">
            <NavLink to="/" end className="bottom-navigation-item">
              <span className="bottom-navigation-icon" aria-hidden="true" />
              <span>ホーム</span>
            </NavLink>
            <NavLink to="/map" className="bottom-navigation-item">
              <span className="bottom-navigation-icon" aria-hidden="true" />
              <span>マップ</span>
            </NavLink>
            <NavLink to="/ocr" className="bottom-navigation-item bottom-navigation-camera">
              <span className="bottom-navigation-camera-button">
                <span className="bottom-navigation-icon" aria-hidden="true" />
              </span>
              <span>撮影</span>
            </NavLink>
            <NavLink to="/calculator" className="bottom-navigation-item">
              <span className="bottom-navigation-icon" aria-hidden="true" />
              <span>保存</span>
            </NavLink>
            <NavLink to="/settings" className="bottom-navigation-item">
              <span className="bottom-navigation-icon" aria-hidden="true" />
              <span>設定</span>
            </NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculator" element={<FeeCalculatorPage />} />
          <Route path="/parking" element={<ParkingActivePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/map" element={<ParkingMapPage />} />
          <Route path="/ocr" element={<PhotoOcrPage />} />
        </Routes>

        {/* リアルタイム通知トースト */}
        <NotificationToast />
      </main>
    </BrowserRouter>
  );
}

export default App;