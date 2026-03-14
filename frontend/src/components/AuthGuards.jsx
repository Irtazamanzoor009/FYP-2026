import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export const ProtectedRoutes = () => {
    const { isAuthenticated, isCheckingAuth } = useAuthStore();

    if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center text-[#2c3e50] font-bold">Loading...</div>;

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export const PublicRoutes = () => {
    const { isAuthenticated, isCheckingAuth } = useAuthStore();

    if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center text-[#2c3e50] font-bold">Loading...</div>;

    return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};