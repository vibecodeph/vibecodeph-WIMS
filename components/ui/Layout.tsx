
import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Package, 
  ClipboardList, 
  Barcode, 
  Settings, 
  Menu, 
  X,
  LogOut,
  UserCircle
} from 'lucide-react';
// Fix: Import auth and signOut from local firebase mock instead of firebase/auth
import { auth, signOut } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const handleLogout = async () => {
    // Fix: signOut requires the auth instance in modular SDK mock
    await signOut(auth);
    navigate('/login');
  };

  const isAdmin = userProfile?.role === UserRole.ADMIN;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, restricted: false },
    { path: '/inventory', label: 'Inventory', icon: <ClipboardList size={20} />, restricted: false },
    { path: '/items', label: 'Items Catalog', icon: <Package size={20} />, restricted: true }, 
    { path: '/locations', label: 'Locations', icon: <MapPin size={20} />, restricted: false },
    { path: '/users', label: 'Users', icon: <Users size={20} />, restricted: true },
    { path: '/serial-numbers', label: 'Serial Numbers', icon: <Barcode size={20} />, restricted: true },
    { path: '/settings', label: 'Admin Settings', icon: <Settings size={20} />, restricted: true },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">InventoryMaster</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <UserCircle size={32} className="text-slate-400" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{userProfile?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{userProfile?.email}</p>
              <span className="text-xs uppercase bg-blue-600 px-1.5 py-0.5 rounded text-[10px] mt-1 inline-block">
                {userProfile?.role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            if (item.restricted && !isAdmin) return null;

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:bg-red-900/50 hover:text-red-200 transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center px-4 lg:px-8 border-b border-slate-200">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600 mr-4"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
             {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
          </h2>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
