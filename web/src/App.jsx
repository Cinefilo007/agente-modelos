import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';

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
import AdminPanel from './pages/AdminPanel';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ClientProfile from './pages/ClientProfile';
import ServiceCheckout from './pages/ServiceCheckout';
import Onboarding from './pages/Onboarding';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

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
  const isClient = user.role === 'client';
  const isModel = user.role === 'model';

  // A model should NEVER go to onboarding
  const needsOnboarding = isClient && (!user.birth_date || !user.terms_accepted);
  const isCurrentlyInOnboarding = location.pathname === '/onboarding';

  if (isModel && isCurrentlyInOnboarding) {
    console.log("[Router] Modelo detectado en onboarding, redirigiendo al feed saludablemente.");
    return <Navigate to="/" replace />;
  }

  if (needsOnboarding && !isCurrentlyInOnboarding) {
    console.warn("[Router] Cliente con perfil incompleto, redirigiendo a onboarding.");
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && isCurrentlyInOnboarding) {
    console.log("[Router] Perfil ya completo, redirigiendo al feed.");
    return <Navigate to="/" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route: Landing Page */}
            <Route path="/landing" element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Feed />} />
              <Route path="explore" element={<Explore />} />
              <Route path="profile/:username?" element={<Profile />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="create-post" element={<CreatePost />} />
              <Route path="create-story" element={<CreateStory />} />
              <Route path="post/:id" element={<PostDetail />} />
              <Route path="admin-panel" element={<AdminPanel />} />
              <Route path="super-admin" element={<SuperAdminDashboard />} />
              <Route path="client" element={<ClientProfile />} />
              <Route path="checkout" element={<ServiceCheckout />} />
            </Route>

            {/* Onboarding Route */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />

            {/* Catch all - Redirect to Landing */}
            <Route path="*" element={<Navigate to="/landing" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
