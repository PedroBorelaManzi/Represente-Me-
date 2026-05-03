import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/LandingPitch";
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/Map";
import LinksPage from "./pages/Links";
import CRMPage from "./pages/CRM";
import ClientDetailsPage from "./pages/ClientDetails";
import EmpresasPage from "./pages/Empresas";
import AgendaPage from "./pages/Agenda";
import EmailClient from "./pages/EmailClient";
import EmailCallback from "./pages/EmailCallback";
import PedidosPage from "./pages/Pedidos";
import GoogleCallback from "./pages/GoogleCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { UploadProvider } from "./contexts/UploadContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" expand={false} richColors />
      <SettingsProvider>
        <UploadProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="map" element={<MapPage />} />
                  <Route path="links" element={<LinksPage />} />
                  <Route path="clientes" element={<CRMPage />} />
                  <Route path="clientes/:id" element={<ClientDetailsPage />} />
                  <Route path="empresas" element={<EmpresasPage />} />
                  <Route path="agenda" element={<AgendaPage />} />
                  <Route path="email" element={<EmailClient />} />
                  <Route path="pedidos" element={<PedidosPage />} />
                </Route>
              </Route>

              {/* Google OAuth Callback */}
              <Route path="/auth/callback/google" element={<GoogleCallback />} />
              <Route path="/auth/callback/email" element={<EmailCallback />} />
              
              {/* Public Legal Routes */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </UploadProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}