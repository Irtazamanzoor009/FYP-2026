import React from 'react';
import { LogOut, X } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                        <LogOut size={20} />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <h3 className="text-lg font-bold text-[#2c3e50]">Confirm Logout</h3>
                <p className="text-sm text-gray-500 mt-2">Are you sure you want to log out of ProManage Bot? Your active AI analysis will continue in the background.</p>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all">Logout</button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;