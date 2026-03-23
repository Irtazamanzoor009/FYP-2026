import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, LayoutGrid, ChevronDown, Check, ChevronUp } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const DashboardHeader = () => {
    const {
        projects,
        selectedProject,
        setSelectedProject,
        fetchJiraProjects,
        syncJiraData,
        isSyncing,
        user
    } = useAuthStore();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (user?.jiraDomain) fetchJiraProjects();
    }, [user, fetchJiraProjects]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSync = async () => {
        const tid = toast.loading(`Syncing...`);
        const res = await syncJiraData();
        if (res.success) toast.success("Data updated!", { id: tid });
        else toast.error("Sync failed", { id: tid });
    };

    if (!user?.jiraDomain) return null;

    return (
        /* STABLE WRAPPER: Forced high Z-index with brackets */
        <div className="relative z-[100] w-full bg-white border-b border-gray-100 shadow-sm">

            {/* 1. MOBILE TOGGLE HANDLE (Hidden on Desktop) */}
            <button
                onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                className="lg:hidden w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50"
            >
                {selectedProject ? selectedProject.name : 'Project Tools'}
                <ChevronDown size={14} className={`transition-transform duration-300 ${isMobileExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* 2. MAIN HEADER CONTENT */}

            <div className={`
                px-4 lg:px-8 transition-all duration-300 ease-in-out
                ${isMobileExpanded ? 'block py-4' : 'hidden lg:flex lg:py-1 lg:items-center lg:justify-between'}
            `}>
                <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-3">

                    {/* PROJECT SELECTOR */}
                    <div className="relative w-full lg:w-auto" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full lg:w-auto flex items-center gap-3 px-3 py-1 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all group"
                        >
                            <div className="p-1.5 bg-[#2c3e50]/5 rounded text-[#2c3e50] group-hover:bg-[#18bc9c]/10 group-hover:text-[#18bc9c] transition-colors">
                                <LayoutGrid size={16} />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Active Project</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[#2c3e50] whitespace-nowrap">
                                        {selectedProject ? `${selectedProject.name} (${selectedProject.key})` : 'Select Project'}
                                    </span>
                                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </button>

                        {/* DROPDOWN MENU */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[110] animate-in fade-in zoom-in-95">
                                <div className="max-h-60 overflow-y-auto">
                                    {projects.length === 0 ? (
                                        <div className="px-4 py-2 text-xs text-gray-400 italic">No projects found</div>
                                    ) : (
                                        projects.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedProject(p); setIsDropdownOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-all text-left ${selectedProject?.id === p.id ? 'bg-[#18bc9c]/5 text-[#18bc9c] font-bold' : 'text-[#2c3e50] hover:bg-gray-50 font-medium'}`}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span>{p.name}</span>
                                                    <span className="text-[9px] opacity-50 font-bold uppercase">{p.key}</span>
                                                </div>
                                                {selectedProject?.id === p.id && <Check size={14} />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* REFRESH BUTTON */}
                    <div className="w-full lg:w-auto flex justify-center lg:justify-end">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${isSyncing
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#2c3e50] text-white hover:bg-[#18bc9c] shadow-md hover:shadow-lg active:scale-95'}
                            `}
                        >
                            <RefreshCw size={12} className={`${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Refresh Insights'}
                        </button>
                    </div>

                </div>
            </div>

            {/* 3. MOBILE CLOSE HANDLE (Visible only when expanded on mobile) */}
            {isMobileExpanded && (
                <button
                    onClick={() => setIsMobileExpanded(false)}
                    className="lg:hidden w-full py-1 flex items-center justify-center text-gray-300 hover:text-gray-400 bg-gray-50"
                >
                    <ChevronUp size={16} />
                </button>
            )}
        </div>
    );
};

export default DashboardHeader;