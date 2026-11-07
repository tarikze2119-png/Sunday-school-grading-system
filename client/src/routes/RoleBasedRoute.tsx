import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-ethiopic">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700 mx-auto"></div>
          <p className="text-sm text-slate-600">መረጃዎችን በመጫን ላይ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-ethiopic">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 space-y-5">
          <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full border border-rose-200">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            ይህንን ገጽ የመመልከት ፈቃድ የለዎትም (Access Denied)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            የአሁኑ አካውንትዎ ደረጃ <strong>({user.role})</strong> ወደዚህ ክፍል ለመግባት የሚያስችል የፈቃድ ገደብ የለውም። 
            እባክዎ የተፈቀደልዎትን ገጽ ብቻ ይጠቀሙ።
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-medium rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ወደ እርስዎ ዋና ገጽ ይመለሱ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
