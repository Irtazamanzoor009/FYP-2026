import React, { useState, useEffect, useCallback } from 'react';
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
    BrainCircuit,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import useDecisionStore from '../../store/decisionStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const styles = {
        APPROVED: 'bg-green-50 text-green-600 border-green-100',
        REJECTED: 'bg-red-50 text-red-600 border-red-100',
        AUTO_EXECUTED: 'bg-blue-50 text-blue-600 border-blue-100'
    };
    const icons = {
        APPROVED: <CheckCircle size={10} />,
        REJECTED: <XCircle size={10} />,
        AUTO_EXECUTED: <Zap size={10} />
    };
    const labels = {
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        AUTO_EXECUTED: 'Auto-Executed'
    };
    return (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
            {icons[status]}
            {labels[status] || status}
        </span>
    );
};

const DecisionHistory = () => {
    const {
        logs,
        statusCounts,
        statusFilter,
        isLoading,
        fetchDecisions,
        setStatusFilter,
        setSearchQuery,
        undoDecision
    } = useDecisionStore();

    const { selectedProject } = useAuthStore();
    const [expandedRow, setExpandedRow] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [undoing, setUndoing] = useState(null);

    useEffect(() => {
        fetchDecisions();
    }, [selectedProject?.key]);

    // Debounced search
    const handleSearch = useCallback(
        debounce((value) => setSearchQuery(value), 500),
        []
    );

    const handleSearchInput = (e) => {
        setSearchInput(e.target.value);
        handleSearch(e.target.value);
    };

    const handleUndo = async (e, logId) => {
        e.stopPropagation();
        setUndoing(logId);
        const res = await undoDecision(logId);
        setUndoing(null);
        if (res.success) {
            toast.success(
                res.data?.jiraUndoSuccess
                    ? 'Action undone and reverted in Jira!'
                    : 'Action marked as undone.',
                { icon: '↩️' }
            );
        } else {
            toast.error(res.message || 'Undo failed');
        }
    };

    const filterButtons = [
        { key: 'ALL', label: 'All' },
        { key: 'APPROVED', label: 'Approved' },
        { key: 'REJECTED', label: 'Rejected' },
        { key: 'AUTO_EXECUTED', label: 'Auto-Executed' }
    ];

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Decision History & Audit</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Complete traceability of AI-human interactions and Jira updates.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <History size={16} className="text-[#18bc9c]" />
                    <span className="text-xs font-bold text-[#2c3e50]">Audit Log: Active</span>
                </div>
            </header>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={handleSearchInput}
                            placeholder="Search actions or tasks..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-[#18bc9c] outline-none"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    <Filter size={16} className="text-gray-400 shrink-0" />
                    {filterButtons.map(btn => (
                        <button
                            key={btn.key}
                            onClick={() => setStatusFilter(btn.key)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${statusFilter === btn.key
                                    ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#18bc9c]'
                                }`}
                        >
                            {btn.label}
                            {statusCounts[btn.key] > 0 && (
                                <span className="ml-1 opacity-60">
                                    ({statusCounts[btn.key]})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                </div>
            )}

            {/* Empty state */}
            {!isLoading && logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100">
                    <History size={32} className="text-gray-300" />
                    <p className="text-sm text-gray-500">No decision logs found</p>
                    <p className="text-xs text-gray-400">
                        Approve or ignore suggestions to see logs here
                    </p>
                </div>
            )}

            {/* Audit Table */}
            {!isLoading && logs.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 w-10" />
                                <th className="px-6 py-4">Action Details</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4">Executor</th>
                                <th className="px-6 py-4 text-right">Activity</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs lg:text-sm">
                            {logs.map((item) => (
                                <React.Fragment key={item._id}>
                                    <tr
                                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedRow === item._id ? 'bg-gray-50/80' : ''}`}
                                        onClick={() => setExpandedRow(
                                            expandedRow === item._id ? null : item._id
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            {expandedRow === item._id
                                                ? <ChevronUp size={16} className="text-gray-400" />
                                                : <ChevronDown size={16} className="text-gray-400" />
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#2c3e50]">
                                                    {item.actionType?.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {item.actionDetail}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-medium text-[#2c3e50]">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                    <User size={12} className="text-gray-400" />
                                                </div>
                                                <span className="text-xs">{item.executedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-[11px] text-gray-400 font-medium">
                                                    {item.timestamp
                                                        ? new Date(item.timestamp)
                                                            .toLocaleDateString('en-GB', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                        : 'Unknown'}
                                                </span>
                                                {item.canUndoNow && !item.undone && (
                                                    <button
                                                        onClick={(e) => handleUndo(e, item._id)}
                                                        disabled={undoing === item._id}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-[#18bc9c] hover:bg-[#18bc9c] hover:text-white px-2 py-1 rounded border border-[#18bc9c] transition-all disabled:opacity-60"
                                                    >
                                                        {undoing === item._id
                                                            ? <Loader2 size={10} className="animate-spin" />
                                                            : <RotateCcw size={10} />
                                                        }
                                                        Undo
                                                    </button>
                                                )}
                                                {item.undone && (
                                                    <span className="text-[10px] text-gray-400 italic">
                                                        Undone
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expandable reasoning */}
                                    {expandedRow === item._id && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan="5" className="px-12 py-6 border-b border-gray-100">
                                                <div className="flex gap-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="p-3 bg-white rounded-xl shadow-sm h-fit shrink-0">
                                                        <BrainCircuit className="text-[#18bc9c]" size={20} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            AI Reasoning Log (Module 7)
                                                        </h4>
                                                        <p className="text-xs text-gray-600 leading-relaxed italic max-w-2xl bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                            "{item.aiReasoning || 'No reasoning available'}"
                                                        </p>
                                                        {item.jiraIssueKey && (
                                                            <p className="text-[10px] text-gray-400">
                                                                Jira Issue: <span className="font-bold text-[#2c3e50]">{item.jiraIssueKey}</span>
                                                            </p>
                                                        )}
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
            )}

            {/* Footer */}
            <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-[10px] text-gray-400">
                    All logs are stored in the Audit Database for compliance and academic evaluation.
                </p>
            </div>
        </div>
    );
};

// Simple debounce utility
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export default DecisionHistory;