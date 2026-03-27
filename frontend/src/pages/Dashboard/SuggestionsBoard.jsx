import React, { useEffect, useState } from 'react';
import {
    Lightbulb,
    CheckCircle2,
    XCircle,
    MessageCircleQuestion,
    Zap,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    Loader2,
    X,
    Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import useSuggestionsStore from '../../store/suggestionsStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// Priority badge styles
// ─────────────────────────────────────────
const getPriorityStyle = (priority) => {
    if (priority === 'URGENT') return 'bg-red-50 text-red-600 border-red-100';
    if (priority === 'SOON') return 'bg-yellow-50 text-yellow-600 border-yellow-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
};

const getPriorityLabel = (priority) => {
    if (priority === 'URGENT') return 'Urgent';
    if (priority === 'SOON') return 'Soon';
    return 'Optional';
};

// ─────────────────────────────────────────
// Status badge styles
// ─────────────────────────────────────────
const getStatusStyle = (status) => {
    if (status === 'APPROVED') return 'bg-green-50 text-green-600 border border-green-100';
    if (status === 'IGNORED') return 'bg-gray-100 text-gray-500 border border-gray-200';
    return '';
};

// ─────────────────────────────────────────
// Explain Modal
// ─────────────────────────────────────────
const ExplainModal = ({ explanation, title, onClose }) => (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#18bc9c]/10 rounded-xl">
                        <Bot size={18} className="text-[#18bc9c]" />
                    </div>
                    <h3 className="font-bold text-[#2c3e50] text-sm">AI Explanation</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X size={16} className="text-gray-400" />
                </button>
            </div>
            <p className="text-xs text-gray-500 mb-4 font-medium">{title}</p>
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {explanation}
            </div>
            <button
                onClick={onClose}
                className="mt-4 w-full py-2 bg-[#2c3e50] text-white rounded-xl text-xs font-bold hover:bg-[#18bc9c] transition-all"
            >
                Got it
            </button>
        </div>
    </div>
);

// ─────────────────────────────────────────
// Single Suggestion Card
// ─────────────────────────────────────────
const SuggestionCard = ({ item, onApprove, onIgnore, onExplain, isApproving, isIgnoring, isExplaining }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 transition-all group ${item.status !== 'PENDING' ? 'opacity-60' : 'hover:shadow-md'
        }`}>
        {/* Left: Icon & Priority */}
        <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 bg-[#18bc9c]/10 rounded-2xl flex items-center justify-center text-[#18bc9c] mb-3 group-hover:scale-110 transition-transform">
                <Lightbulb size={28} />
            </div>
            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${getPriorityStyle(item.priority)}`}>
                {getPriorityLabel(item.priority)}
            </span>
            {item.status !== 'PENDING' && (
                <span className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusStyle(item.status)}`}>
                    {item.status}
                </span>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
            <div>
                <h3 className="text-lg font-bold text-[#2c3e50] group-hover:text-[#18bc9c] transition-colors">
                    {item.title}
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl mt-3 border-l-4 border-gray-200 text-xs lg:text-sm text-gray-600 leading-relaxed italic">
                    "AI Reasoning: {item.aiReasoning}"
                </div>
            </div>

            {/* Impact Preview */}
            <div className="bg-[#18bc9c]/5 border border-[#18bc9c]/20 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-[#18bc9c] text-white rounded-lg shrink-0">
                    <TrendingUp size={16} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-[#18bc9c] uppercase tracking-widest">
                        Impact Preview
                    </h4>
                    <p className="text-xs font-bold text-[#2c3e50]">{item.impactPreview}</p>
                </div>
            </div>

            {/* Actions */}
            {item.status === 'PENDING' && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onApprove(item._id)}
                            disabled={isApproving === item._id || isIgnoring === item._id}
                            className="flex items-center gap-2 bg-[#18bc9c] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#128f76] transition-all shadow-lg shadow-[#18bc9c]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isApproving === item._id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <CheckCircle2 size={16} />
                            }
                            {isApproving === item._id ? 'Syncing...' : 'Approve & Sync Jira'}
                        </button>
                        <button
                            onClick={() => onIgnore(item._id)}
                            disabled={isApproving === item._id || isIgnoring === item._id}
                            className="flex items-center gap-2 border border-gray-200 text-gray-500 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all disabled:opacity-60"
                        >
                            {isIgnoring === item._id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <XCircle size={16} />
                            }
                            {isIgnoring === item._id ? 'Ignoring...' : 'Ignore'}
                        </button>
                    </div>
                    <button
                        onClick={() => onExplain(item._id, item.title)}
                        disabled={isExplaining === item._id}
                        className="flex items-center gap-2 text-[#2c3e50] hover:text-[#18bc9c] font-bold text-xs transition-colors px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                    >
                        {isExplaining === item._id
                            ? <Loader2 size={14} className="animate-spin text-[#18bc9c]" />
                            : <MessageCircleQuestion size={16} />
                        }
                        {isExplaining === item._id ? 'Asking AI...' : 'Ask AI Why?'}
                    </button>
                </div>
            )}
        </div>
    </div>
);

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
const SuggestionsBoard = () => {
    const {
        suggestions,
        pendingCount,
        statusFilter,
        isLoading,
        isGenerating,
        fetchSuggestions,
        setStatusFilter,
        generateSuggestions,
        forceRegenerate,
        approveSuggestion,
        ignoreSuggestion,
        explainSuggestion
    } = useSuggestionsStore();

    const { selectedProject } = useAuthStore();
    const [explainModal, setExplainModal] = useState(null);
    // const [isActioning, setIsActioning] = useState(null);
    // const [isExplaining, setIsExplaining] = useState(null);

    const [isApproving, setIsApproving] = useState(null);
    const [isIgnoring, setIsIgnoring] = useState(null);
    const [isExplaining, setIsExplaining] = useState(null);

    useEffect(() => {
        fetchSuggestions();
    }, [selectedProject?.key]);

    const handleGenerate = async () => {
        const tid = toast.loading('Generating AI suggestions...');
        const res = await generateSuggestions();
        if (res.success) {
            toast.success(
                res.generated > 0
                    ? `${res.generated} suggestions generated!`
                    : res.message || 'Suggestions already exist',
                { id: tid }
            );
        } else {
            toast.error(res.message || 'Generation failed', { id: tid });
        }
    };

    const handleForceRegenerate = async () => {
        const tid = toast.loading('Regenerating suggestions...');
        const res = await forceRegenerate();
        if (res.success) {
            toast.success(`${res.generated} fresh suggestions generated!`, { id: tid });
        } else {
            toast.error('Regeneration failed', { id: tid });
        }
    };

    const handleApprove = async (id) => {
        setIsApproving(id);
        const res = await approveSuggestion(id);
        setIsApproving(null);
        if (res.success) {
            toast.success(
                res.data?.jiraSyncSuccess
                    ? 'Approved and synced to Jira!'
                    : 'Approved. Manual Jira action may be needed.',
                { icon: '✅' }
            );
        } else {
            toast.error(res.message || 'Approval failed');
        }
    };

    const handleIgnore = async (id) => {
        setIsIgnoring(id);
        const res = await ignoreSuggestion(id);
        setIsIgnoring(null);
        if (res.success) toast.success('Suggestion ignored', { icon: '🗑️' });
        else toast.error('Failed to ignore');
    };

    const handleExplain = async (id, title) => {
        setIsExplaining(id);
        const data = await explainSuggestion(id);
        setIsExplaining(null);
        setExplainModal({ explanation: data.explanation, title });
    };

    // const handleExplain = async (id, title) => {
    //     setIsActioning(id);
    //     const data = await explainSuggestion(id);
    //     setIsActioning(null);
    //     setExplainModal({ explanation: data.explanation, title });
    // };

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">

            {explainModal && (
                <ExplainModal
                    explanation={explainModal.explanation}
                    title={explainModal.title}
                    onClose={() => setExplainModal(null)}
                />
            )}

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">AI Suggestions Board</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Intelligent recommendations generated by the Agentic AI Decision Engine.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <Zap size={16} className="text-[#18bc9c]" />
                        <span className="text-xs font-bold text-[#2c3e50]">
                            {pendingCount} Active Suggestions
                        </span>
                    </div>
                    <button
                        onClick={handleForceRegenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['ALL', 'PENDING', 'APPROVED', 'IGNORED'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all border ${statusFilter === s
                            ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#18bc9c]'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {(isLoading || isGenerating) && (
                <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                    <span className="text-sm text-gray-500">
                        {isGenerating ? 'Generating suggestions with AI...' : 'Loading...'}
                    </span>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isGenerating && suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-16 h-16 bg-[#18bc9c]/10 rounded-2xl flex items-center justify-center">
                        <Lightbulb size={32} className="text-[#18bc9c]" />
                    </div>
                    <p className="text-sm font-bold text-[#2c3e50]">No suggestions yet</p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                        Generate AI-powered suggestions based on your current sprint data.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-[#18bc9c] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#128f76] transition-all shadow-lg shadow-[#18bc9c]/20"
                    >
                        <Zap size={16} /> Generate Suggestions
                    </button>
                </div>
            )}

            {/* Suggestions list */}
            {!isLoading && !isGenerating && suggestions.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                    {suggestions.map((item) => (
                        <SuggestionCard
                            key={item._id}
                            item={item}
                            onApprove={handleApprove}
                            onIgnore={handleIgnore}
                            onExplain={handleExplain}
                            isApproving={isApproving}
                            isIgnoring={isIgnoring}
                            isExplaining={isExplaining}
                        />
                    ))}
                </div>
            )}

            {/* Footer */}
            {suggestions.length > 0 && (
                <div className="flex items-center gap-2 justify-center py-6">
                    <AlertTriangle size={14} className="text-gray-400" />
                    <p className="text-[10px] text-gray-400 font-medium">
                        All approved suggestions will automatically update your connected Jira workspace.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SuggestionsBoard;