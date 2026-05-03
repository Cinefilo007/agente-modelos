import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import api from './api/axios';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import Explore from './pages/Explore';
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import EditProfile from './pages/EditProfile';
import PostDetail from './pages/PostDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import AdminGifts from './pages/AdminGifts';
import ClientProfile from './pages/ClientProfile';
import ServiceCheckout from './pages/ServiceCheckout';
import ServiceInvoicePage from './pages/ServiceInvoicePage';
import OrderDetails from './pages/OrderDetails';
import Support from './pages/Support';
import ShopManager from './pages/ShopManager';
import Onboarding from './pages/Onboarding';
import InstallPWA from './components/pwa/InstallPWA';
import WalletPage from './pages/WalletPage';
import Promotions from './pages/Promotions';
import AdvertiserProfile from './pages/AdvertiserProfile';
import Casino from './pages/Casino';
import FanLanding from './pages/FanLanding';
import CreatorLanding from './pages/CreatorLanding';

const TelegramInitializer = () => {
  useEffect(() => {
    if (window.Telegram?.WebApp && window.Telegram.WebApp.isVersionAtLeast('6.1')) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      try {
        window.Telegram.WebApp.setHeaderColor('#000000');
      } catch (e) {}
    } else if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);
  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
     <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
     </div>
  );

  // Excepciones para las páginas públicas (Landings)
  const isPublicPath = ['/landing', '/fans', '/creators'].includes(location.pathname);
  
  if (!user && !isPublicPath) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  // Si el usuario ya tiene sesión y está en una landing, redirigir al feed
  if (user && isPublicPath) {
     return <Navigate to={user.role === 'admin' ? "/admin" : "/"} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  return <AdminPanel />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ThemeProvider>
            <InstallPWA />
            <BrowserRouter>
              <TelegramInitializer />
              <Routes>
                {/* Public Route: Landing Page (Selector) */}
                <Route path="/landing" element={
                  <PublicRoute>
                    <LandingPage />
                  </PublicRoute>
                } />

                {/* Specific Landings (Hybrid: Allowed for guest and logged-in) */}
                <Route path="/fans" element={
                  <ProtectedRoute>
                    <FanLanding />
                  </ProtectedRoute>
                } />

                <Route path="/creators" element={
                  <ProtectedRoute>
                    <CreatorLanding />
                  </ProtectedRoute>
                } />

                {/* Perfiles Públicos Generales de la App removidos de aquí */}

                {/* Admin Route - Separate Layout potentially? Or same? Let's use separate for focus */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                } />

                <Route path="/admin/gifts" element={
                  <ProtectedRoute>
                    <AdminGifts />
                  </ProtectedRoute>
                } />

                {/* Rutas Públicas e Independientes (MiniApps) */}
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/promotions/advertiser/:userId" element={<AdvertiserProfile />} />

                {/* Main App with Navigation (Public + Protected) */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                  <Route path="explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                  <Route path="reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                  <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                  <Route path="create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
                  <Route path="create-story" element={<ProtectedRoute><CreateStory /></ProtectedRoute>} />
                  <Route path="post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
                  <Route path="service/:serviceId" element={<ProtectedRoute><ServiceInvoicePage /></ProtectedRoute>} />
                  <Route path="checkout" element={<ProtectedRoute><ServiceCheckout /></ProtectedRoute>} />
                  <Route path="order/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                  <Route path="support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                  <Route path="shop-manager" element={<ProtectedRoute><ShopManager /></ProtectedRoute>} />
                  <Route path="profile" element={<ProtectedRoute><Navigate to="/me" replace /></ProtectedRoute>} />
                  <Route path="me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="casino/:username" element={<ProtectedRoute><Casino /></ProtectedRoute>} />

                  {/* Public Profile */}
                  <Route path=":username" element={<Profile />} />
                </Route>

                {/* Onboarding Route */}
                <Route path="/onboarding" element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                } />

                {/* Wallet Route */}
                <Route path="/wallet" element={
                  <ProtectedRoute>
                    <WalletPage />
                  </ProtectedRoute>
                } />

                {/* Catch all - Redirect to Landing */}
                <Route path="*" element={<Navigate to="/landing" replace />} />
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
