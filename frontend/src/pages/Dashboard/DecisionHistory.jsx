import React, { useState } from 'react';
import {
    History,
    CheckCircle,
    XCircle,
    Zap,
    User,
    Filter,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Search,
    BrainCircuit
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- HIGH FIDELITY DUMMY DATA ---
const AUDIT_DATA = [
    {
        id: '102',
        action: 'Task Reassignment',
        target: 'Login API (PROJ-22)',
        status: 'Approved',
        by: 'John Doe',
        time: '2 hours ago',
        reasoning: 'AI detected Alex was at 115% capacity. Suggested move to Ali (65% capacity). Manual review confirmed Ali has the required Security skills.',
        canUndo: true
    },
    {
        id: '101',
        action: 'Deadline Extension',
        target: 'Database Migration (PROJ-04)',
        status: 'Rejected',
        by: 'John Doe',
        time: '5 hours ago',
        reasoning: 'AI suggested 3-day buffer due to historical complexity. PM rejected because client milestone is non-negotiable.',
        canUndo: false
    },
    {
        id: '100',
        action: 'Status Update',
        target: 'UI Component Library',
        status: 'Auto-Executed',
        by: 'AI Agent',
        time: 'Yesterday',
        reasoning: 'System detected PR #544 merged in GitHub. Automated rule updated Jira status from "Review" to "Done".',
        canUndo: true
    },
    {
        id: '099',
        action: 'Priority Escallation',
        target: 'Auth Bug (PROJ-12)',
        status: 'Approved',
        by: 'Sarah Khan',
        time: 'Yesterday',
        reasoning: 'Agentic engine flagged this bug as a critical path blocker for the entire Frontend team.',
        canUndo: false
    },
];

const DecisionHistory = () => {
    const [filter, setFilter] = useState('All');
    const [expandedRow, setExpandedRow] = useState(null);

    const handleUndo = (id) => {
        toast.success(`Action #${id} has been undone in Jira.`, {
            icon: '🔄',
            style: { borderRadius: '10px', background: '#2c3e50', color: '#fff' }
        });
    };

    const filteredData = AUDIT_DATA.filter(item =>
        filter === 'All' ? true : item.status === filter
    );

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">

            {/* 1. HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Decision History & Audit</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete traceability of AI-human interactions and Jira updates.</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <History size={16} className="text-[#18bc9c]" />
                    <span className="text-xs font-bold text-[#2c3e50]">Audit Log: Active</span>
                </div>
            </header>

            {/* 2. FILTERS & SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search actions or tasks..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-[#18bc9c] outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    <Filter size={16} className="text-gray-400 shrink-0" />
                    {['All', 'Approved', 'Rejected', 'Auto-Executed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${filter === status
                                    ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#18bc9c]'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. AUDIT TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Action Details</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4">Executor</th>
                            <th className="px-6 py-4 text-right">Activity</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs lg:text-sm">
                        {filteredData.map((item) => (
                            <React.Fragment key={item.id}>
                                <tr
                                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === item.id ? 'bg-gray-50/80' : ''}`}
                                    onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                                >
                                    <td className="px-6 py-4">
                                        {expandedRow === item.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#2c3e50]">{item.action}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{item.target}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${item.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    item.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                {item.status === 'Approved' ? <CheckCircle size={10} /> :
                                                    item.status === 'Rejected' ? <XCircle size={10} /> : <Zap size={10} />}
                                                {item.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-medium text-[#2c3e50]">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User size={12} className="text-gray-400" />
                                            </div>
                                            {item.by}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[11px] text-gray-400 font-medium">{item.time}</span>
                                            {item.canUndo && item.status === 'Approved' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUndo(item.id); }}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-[#18bc9c] hover:bg-[#18bc9c] hover:text-white px-2 py-1 rounded border border-[#18bc9c] transition-all"
                                                >
                                                    <RotateCcw size={10} /> Undo
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* EXPANDABLE REASONING ROW */}
                                {expandedRow === item.id && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan="5" className="px-12 py-6 border-b border-gray-100">
                                            <div className="flex gap-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                                                    <BrainCircuit className="text-[#18bc9c]" size={20} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Reasoning Log (Module 7)</h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed italic max-w-2xl bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                        "{item.reasoning}"
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 4. EXPORT / DOCS INFO */}
            <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-[10px] text-gray-400">All logs are stored in the Audit Database for compliance and academic evaluation.</p>
                <button className="text-[11px] font-bold text-[#2c3e50] hover:text-[#18bc9c] flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all">
                    Download Audit Report (PDF/CSV)
                </button>
            </div>

        </div>
    );
};

export default DecisionHistory;