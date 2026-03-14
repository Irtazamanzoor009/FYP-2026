import React from 'react';
import useAuthStore from '../store/authStore';

const Dashboard = () => {
    const { user } = useAuthStore();

    return (
        <div className="min-h-screen p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-secondary">Dashboard Overview</h1>
            <p className="text-gray-600 mt-2">Welcome to your ProManage Bot workspace, <b className="text-primary">{user?.name || 'Manager'}</b>!</p>

            <div className="flex flex-col md:flex-row gap-6 mt-8">
                <div className="flex-1 bg-white p-6 rounded-xl border-l-4 border-primary shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tasks Analyzed</h3>
                    <h1 className="text-5xl font-bold text-secondary mt-3">0</h1>
                    <p className="text-sm text-gray-400 mt-2">Awaiting Jira Sync...</p>
                </div>

                <div className="flex-1 bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">High Risk Alerts</h3>
                    <h1 className="text-5xl font-bold text-secondary mt-3">0</h1>
                    <p className="text-sm text-gray-400 mt-2">System clear</p>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;