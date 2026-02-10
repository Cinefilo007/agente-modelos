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
import EditProfile from './pages/EditProfile';
import PostDetail from './pages/PostDetail';
import AdminPanel from './pages/AdminPanel';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ClientProfile from './pages/ClientProfile';
import ServiceCheckout from './pages/ServiceCheckout';

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
    return <Navigate to="/landing" state={{ from: location }} replace />;
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
              <Route path="post/:id" element={<PostDetail />} />
              <Route path="admin-panel" element={<AdminPanel />} />
              <Route path="super-admin" element={<SuperAdminDashboard />} />
              <Route path="client" element={<ClientProfile />} />
              <Route path="checkout" element={<ServiceCheckout />} />
            </Route>

            {/* Catch all - Redirect to Landing */}
            <Route path="*" element={<Navigate to="/landing" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
