import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import DashboardShell from '../pages/dashboard/DashboardShell';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Authenticated Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        }
      />

      {/* Default Root Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Fallback in Amharic */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 font-ethiopic p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-brand-700">404</h2>
              <p className="text-base font-bold text-slate-800">የተጠየቀው ገጽ አልተገኘም</p>
              <p className="text-xs text-slate-500">
                የተሳሳተ አድራሻ አስገብተዋል ወይም ገጹ ተሰርዟል። እባክዎ ወደ ዋናው ገጽ ይመለሱ።
              </p>
              <a
                href="/dashboard"
                className="inline-block px-5 py-2.5 bg-brand-700 text-white font-medium rounded-lg text-xs hover:bg-brand-800"
              >
                ወደ ዋና ገጽ ተመለስ
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
