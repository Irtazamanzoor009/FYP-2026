import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatDrawer from './ChatDrawer';
import { Bot, Menu, AlertCircle, ChevronRight } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import DashboardHeader from './DashboardHeader';
import useMonitoringStore from '../../store/monitoringStore';
import toast from 'react-hot-toast';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { addAgentLog, addAlert } = useMonitoringStore();

    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?._id) return;

        // Dynamically import socket.io-client
        import('socket.io-client').then(({ io }) => {
            const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', {
                withCredentials: true
            });

            socket.on('connect', () => {
                socket.emit('join', user._id);
            });

            socket.on('agent-activity', (log) => {
                addAgentLog(log);
            });

            socket.on('new-alert', (alert) => {
                addAlert(alert);
                toast.error(`🚨 ${alert.title}`, { duration: 5000 });
            });

            return () => socket.disconnect();
        });
    }, [user?._id]);

    const isJiraConnected = user?.jiraDomain && user?.jiraApiToken;

    return (
        <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
            {/* 1. Sidebar with Chat Trigger */}
            <Sidebar
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                toggleChat={() => setIsChatOpen(!isChatOpen)}
            />

            {/* 2. Chat Drawer */}
            <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-[#2c3e50] text-white p-4 flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-2">
                        <Bot className="text-[#18bc9c]" size={24} />
                        <span className="font-bold text-sm tracking-tight">ProManage Bot</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-1"><Menu size={24} /></button>
                </header>
                <DashboardHeader />

                {!isJiraConnected && (
                    <div className="bg-[#fef9c3] border-b border-[#fde047] px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-3 text-[#854d0e] text-xs lg:text-sm font-medium">
                            <AlertCircle size={18} />
                            <span>Workspace not connected. Connect Jira to enable AI features.</span>
                        </div>
                        <button onClick={() => navigate('/jira-connect')} className="text-xs bg-[#854d0e] text-white px-3 py-1.5 rounded-md flex items-center gap-1">
                            Connect Now <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* Content Outlet */}
                < main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div >
    );
};

export default DashboardLayout;