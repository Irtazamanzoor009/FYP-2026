import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

import { ProtectedRoutes, PublicRoutes } from './components/AuthGuards';
import Loader from './components/Loader';

// Pages
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import VerifyOTP from './pages/Auth/VerifyOTP';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import JiraConnect from './pages/Auth/JiraConnect';
// import Dashboard from './pages/Dashboard';
import NotFound from './pages/Auth/NotFound';
import GoogleCallback from './pages/Auth/GoogleCallback';

import DashboardLayout from './pages/Dashboard/DashboardLayout';
import Overview from './pages/Dashboard/Overview';
import SuggestionsBoard from './pages/Dashboard/SuggestionsBoard';
import RiskAnalytics from './pages/Dashboard/RiskAnalytics';
import DecisionHistory from './pages/Dashboard/DecisionHistory';
import Monitoring from './pages/Dashboard/Monitoring';
import Settings from './pages/Dashboard/Settings';

function App() {
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <Loader size="lg" color="primary" fullScreen={true} text="Loading..." />;
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>

        <Route element={<PublicRoutes />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/google-callback" element={<GoogleCallback />} />
        </Route>

        <Route element={<ProtectedRoutes />}>
          <Route path="/jira-connect" element={<JiraConnect />} />
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="suggestions" element={<SuggestionsBoard />} />
            <Route path="risks" element={<RiskAnalytics />} />
            <Route path="history" element={<DecisionHistory />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>



        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}

export default App;