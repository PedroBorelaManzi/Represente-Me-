import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/LandingPitch";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./contexts/AuthContext";
import Login from './pages/Login';
import Register from './pages/Register';
import Recovery from './pages/Recovery';
import Checkout from './pages/Checkout';
import Layout from "./components/Layout";
import OrderBumpPage from "./pages/OrderBump";
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
import PlanosPage from "./pages/Planos";
import GoogleCallback from "./pages/GoogleCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SyncProvider } from "./contexts/SyncContext";
import { UploadProvider } from "./contexts/UploadContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "sonner";

function LandingOrRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const hasLoggedInOnce = localStorage.getItem("rm_has_logged_in_once") === "true";
  const isMobile = Capacitor.isNativePlatform();

  if (isMobile && hasLoggedInOnce) {
    if (user) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" expand={false} richColors />
      <BrowserRouter>
        <SyncProvider>
          <SettingsProvider>
          <UploadProvider>
            <Routes>
              <Route path="/" element={<LandingOrRedirect />} />
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              <Route path='/recovery' element={<Recovery />} />
                            <Route path='/checkout' element={<Checkout />} />
              <Route path='/planos' element={<PlanosPage />} />
              
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
                <Route path="order-bump" element={<OrderBumpPage />} />
              </Route>

              {/* Google OAuth Callback */}
              <Route path="/auth/callback/google" element={<GoogleCallback />} />
              <Route path="/auth/callback/email" element={<EmailCallback />} />
              
              {/* Public Legal Routes */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </UploadProvider>
        </SettingsProvider>
        </SyncProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}