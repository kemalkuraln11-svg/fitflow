import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import UserLayout from './components/layout/UserLayout';
import AdminLayout from './components/layout/AdminLayout';
import Home from './pages/Home';
import ClassCalendar from './pages/ClassCalendar';
import ClassDetail from './pages/ClassDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClasses from './pages/admin/AdminClasses';
import AdminMembers from './pages/admin/AdminMembers';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Initialize default admin user on first app load
  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        const user = await base44.auth.me();
        if (user?.role === 'admin') {
          // Check if kemalkural already exists
          const existingUsers = await base44.entities.User.list();
          const kKuralExists = existingUsers.some(u => u.email === 'kemalkagankural@gmail.com');
          
          if (!kKuralExists) {
            await base44.users.inviteUser('kemalkagankural@gmail.com', 'admin');
          }
        }
      } catch (err) {
        console.log('Admin initialization completed or not needed');
      }
    };

    if (!isLoadingAuth && !isLoadingPublicSettings) {
      initializeAdmin();
    }
  }, [isLoadingAuth, isLoadingPublicSettings]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<ClassCalendar />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="members" element={<AdminMembers />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App