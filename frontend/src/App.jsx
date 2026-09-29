import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import ScanPage from "./pages/ScanPage";
import AdminPage from "./pages/AdminPage";

function AppNav() {
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";

  return (
    <nav className="border-b bg-white px-6 py-4 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/" className="text-xl font-extrabold text-blue-700">
            Smart Expiration
          </Link>
          <p className="text-sm text-gray-500">Chúc quý khách một ngày mới tốt lành </p>
        </div>

        <div className="flex gap-4">
          {isAdminPage ? (
            <Link
              to="/"
              className="rounded-lg border border-blue-200 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
            >
              User Scan
            </Link>
          ) : (
            <Link
              to="/admin"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppNav />

      <Routes>
        <Route path="/" element={<ScanPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
