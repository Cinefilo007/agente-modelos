import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
// Placeholder pages, we will create them next
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

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
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
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
