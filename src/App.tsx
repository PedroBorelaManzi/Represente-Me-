import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/Map";
import LinksPage from "./pages/Links";
import CRMPage from "./pages/CRM";
import ClientDetailsPage from "./pages/ClientDetails";
import EmpresasPage from "./pages/Empresas";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="map" element={<MapPage />} />
              <Route path="links" element={<LinksPage />} />
              <Route path="clientes" element={<CRMPage />} />
              <Route path="clientes/:id" element={<ClientDetailsPage />} />
              <Route path="empresas" element={<EmpresasPage />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
