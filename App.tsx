import React, { useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CreateJournals from './pages/CreateJournals';
import ViewJournals from './pages/ViewJournals';
import Settings from './pages/Settings';
import './App.css';

interface AppProps {
  isLoggedIn: boolean;
}

const App: React.FC<AppProps> = ({ isLoggedIn }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn);

  const handleLogin = () => {
    setLoggedIn(true);
  };

  const handleLogout = () => {
    setLoggedIn(false);
  };

  // If not logged in, redirect to login page
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} />} />
        <Route path="/create-journals" element={<CreateJournals />} />
        <Route path="/view-journals" element={<ViewJournals />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default App;
