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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Telegram Mini App Config
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Force Fullscreen

      // Set header color
      window.Telegram.WebApp.setHeaderColor('#000000');
    }

    // Heartbeat for Online Status (every 2 mins)
    const heartbeatInterval = setInterval(async () => {
      if (user?.role === 'model') {
        try {
          // Assuming 'api' is imported or globally available
          // If not, you'll need to add 'import api from './utils/api';' or similar
          await api.post('/profile/heartbeat');
        } catch (e) {
          console.error("Heartbeat failed", e);
        }
      }
    }, 120000);

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    console.log("[Router] Usuario no autenticado, redirigiendo a landing.");
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  console.log("[Router] Verificando acceso para:", user.username || user.id, "Rol:", user.role);

  // Strict check for profile completion - Only for CLIENTS
  // Models are already verified by the admin through the bot ( Phase A )
  // Admins are verified by system config
  const isClient = user.role === 'client';
  const isModel = user.role === 'model';
  const isAdmin = user.role === 'admin';

  // A model or admin should NEVER go to onboarding
  const needsOnboarding = isClient && (!user.birth_date || !user.terms_accepted);
  const isCurrentlyInOnboarding = location.pathname === '/onboarding';

  if ((isModel || isAdmin) && isCurrentlyInOnboarding) {
    console.log(`[Router] ${isAdmin ? 'Admin' : 'Modelo'} detectado en onboarding, redirigiendo al feed/admin.`);
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  if (needsOnboarding && !isCurrentlyInOnboarding) {
    // Allow public paths or specific paths? No, strict onboarding.
    console.warn("[Router] Cliente con perfil incompleto, redirigiendo a onboarding.");
    return <Navigate to="/onboarding" replace />;
  }

  // If user is admin trying to access root, maybe redirect to admin dashboard or let them see feed?
  // User asked "if admin enters, redirect to admin panel"
  if (isAdmin && location.pathname === '/' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
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
              <Routes>
                {/* Public Route: Landing Page */}
                <Route path="/landing" element={
                  <PublicRoute>
                    <LandingPage />
                  </PublicRoute>
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
