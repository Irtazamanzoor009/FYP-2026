import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Lightbulb, ShieldAlert, History, BarChart3,
    LogOut, Settings2, Bot, X, Sparkles
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import LogoutModal from '../../components/LogoutModal';

const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'AI Suggestions', icon: Lightbulb, path: '/dashboard/suggestions' },
    { name: 'Risk Analytics', icon: ShieldAlert, path: '/dashboard/risks' },
    { name: 'Decision History', icon: History, path: '/dashboard/history' },
    { name: 'Monitoring', icon: BarChart3, path: '/dashboard/monitoring' },
];

const Sidebar = ({ isOpen, toggleSidebar, toggleChat }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const getInitials = (name) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <>
            {/* Outside Click Overlay for Profile Drawer */}
            {isProfileOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                />
            )}

            {/* Logout Modal */}
            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
            />

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[#2c3e50] transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col text-white shadow-xl`}>

                {/* Logo Section */}
                <div className="p-8 flex items-center justify-between border-b border-[#34495e]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#18bc9c] rounded-xl flex items-center justify-center shadow-lg shadow-[#18bc9c]/20">
                            <Bot className="text-white" size={24} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">
                            ProManage <span className="text-[#18bc9c]">Bot</span>
                        </h1>
                    </div>

                    <button onClick={toggleSidebar} className="lg:hidden text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">

                    <button
                        onClick={() => {
                            toggleChat();
                            if (window.innerWidth < 1024) toggleSidebar();
                        }}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl mb-4 bg-[#18bc9c] text-white shadow-lg shadow-[#18bc9c]/20 hover:bg-[#16a085] transition-all duration-200"
                    >
                        <Sparkles size={20} />
                        <span className="font-semibold">AI Co-Pilot Chat</span>
                    </button>

                    {menuItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.path === '/dashboard'}
                            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                            className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
                ${isActive
                                    ? 'bg-[#18bc9c] text-white shadow-lg shadow-[#18bc9c]/20'
                                    : 'text-gray-400 hover:bg-[#34495e] hover:text-white'}
              `}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Profile Section */}
                <div className=" p-4 border-t border-[#34495e] relative">

                    {isProfileOpen && (
                        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl p-2 text-[#2c3e50] animate-in fade-in slide-in-from-bottom-2 z-50">
                            <button
                                onClick={() => {
                                    navigate('/dashboard/settings');
                                    setIsProfileOpen(false);
                                }}
                                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 rounded-lg text-sm transition-all text-left"
                            >
                                <Settings2 size={16} /> Settings
                            </button>

                            <button
                                onClick={() => {
                                    setShowLogoutModal(true);
                                    setIsProfileOpen(false);
                                }}
                                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 rounded-lg text-sm font-semibold transition-all text-left"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className={`cursor-pointer w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#34495e] ${isProfileOpen ? 'bg-[#34495e]' : ''
                            }`}
                    >

                        {user?.profilePic ? (
                            <img
                                src={user.profilePic}
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#18bc9c]"
                                alt="Profile"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#18bc9c] flex items-center justify-center font-bold text-lg border-2 border-[#34495e]">
                                {getInitials(user?.name)}
                            </div>
                        )}

                        <div className="text-left overflow-hidden">
                            <p className="text-sm font-bold truncate">{user?.name || 'Manager'}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </button>

                </div>
            </div>
        </>
    );
};

export default Sidebar;