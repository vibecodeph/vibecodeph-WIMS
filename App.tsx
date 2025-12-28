import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/ui/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import LocationsPage from './pages/Locations';
import ItemsPage from './pages/Items';
import InventoryPage from './pages/Inventory';
import AdminSettings from './pages/AdminSettings';
import { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: UserRole[] }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (allowedRoles) {
     if (!userProfile) {
         return (
             <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
                 <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center border border-slate-200">
                     <h2 className="text-2xl font-bold text-red-600 mb-2">Profile Missing</h2>
                     <p className="text-slate-600 mb-6">Your authentication is valid, but no user profile exists in the database.</p>
                     <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                     >
                        Retry Loading
                     </button>
                 </div>
             </div>
         );
     }

     if (!allowedRoles.includes(userProfile.role)) {
        return (
             <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
                 <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center border border-slate-200">
                     <h2 className="text-2xl font-bold text-amber-600 mb-2">Access Restricted</h2>
                     <p className="text-slate-600 mb-6">You do not have the necessary permissions ({allowedRoles.join(', ')}) to access this page.</p>
                     <Navigate to="/" replace />
                 </div>
             </div>
        );
     }
  }

  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                
                <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/settings" element={<AdminSettings />} />
                  <Route path="/serial-numbers" element={<div className="p-8 text-slate-500 bg-white rounded-lg shadow-sm">Serial Number Tracking Module coming soon.</div>} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;