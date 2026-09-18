import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { FeeCalculatorPage } from "./pages/FeeCalculatorPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
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
            <Link to="/settings">設定</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculator" element={<FeeCalculatorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;