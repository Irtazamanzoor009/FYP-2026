import React, { useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    RefreshCw,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    Zap
} from 'lucide-react';
import useOverviewStore from '../../store/overviewStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// HELPER: Completion rate color
// ─────────────────────────────────────────
const getCompletionColor = (rate) => {
    if (rate >= 90) return 'text-[#18bc9c]';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
};

const getCompletionBg = (rate) => {
    if (rate >= 90) return 'bg-[#18bc9c]/10 text-[#18bc9c]';
    if (rate >= 70) return 'bg-yellow-50 text-yellow-600';
    return 'bg-red-50 text-red-500';
};

const SprintAnalytics = () => {
    const {
        sprintHistory,
        overviewData,
        fetchSprintHistory,
        fetchOverview
    } = useOverviewStore();
    const { selectedProject } = useAuthStore();

    useEffect(() => {
        fetchSprintHistory();
        if (!overviewData) fetchOverview();
    }, [selectedProject]);

    if (!sprintHistory) {
        return (
            <div className="space-y-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-6 h-32 border border-gray-100" />
                ))}
            </div>
        );
    }

    const {
        currentSprint,
        historicalVelocity,
        averageVelocity,
        closedSprints,
        velocityTrend
    } = sprintHistory;

    const maxVelocity = Math.max(
        ...closedSprints.map(s => s.velocity),
        currentSprint?.totalStoryPoints || 0
    );

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">

            {/* ── HEADER ── */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Sprint Analytics</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Historical sprint performance and velocity trends.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <BarChart3 size={16} className="text-[#18bc9c]" />
                    <span className="text-xs font-bold text-[#2c3e50]">
                        {closedSprints.length} Completed Sprints
                    </span>
                </div>
            </header>

            {/* ── CURRENT SPRINT INFO CARD ── */}
            {currentSprint && (
                <div className="bg-[#2c3e50] rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#18bc9c] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Current Active Sprint
                        </span>
                    </div>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">{currentSprint.name}</h2>
                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <Calendar size={12} />
                                <span>
                                    {currentSprint.startDate
                                        ? new Date(currentSprint.startDate)
                                            .toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                        : 'N/A'}
                                    {' → '}
                                    {currentSprint.endDate
                                        ? new Date(currentSprint.endDate)
                                            .toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <p className="text-2xl font-black text-[#18bc9c]">
                                    {currentSprint.completedStoryPoints}
                                    <span className="text-gray-400 text-sm font-medium">
                                        /{currentSprint.totalStoryPoints}
                                    </span>
                                </p>
                                <p className="text-[10px] font-black uppercase text-gray-400">
                                    Points Done
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-[#18bc9c]">
                                    {overviewData?.healthScore?.meta?.daysRemaining ?? 0}
                                </p>
                                <p className="text-[10px] font-black uppercase text-gray-400">
                                    Days Left
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-[#18bc9c]">
                                    {averageVelocity}
                                </p>
                                <p className="text-[10px] font-black uppercase text-gray-400">
                                    Avg Velocity
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── VELOCITY COMPARISON ── */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Zap size={18} className="text-[#18bc9c]" />
                        <h3 className="font-bold text-[#2c3e50]">Velocity Comparison</h3>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${velocityTrend === 'improving'
                            ? 'bg-[#18bc9c]/10 text-[#18bc9c]'
                            : velocityTrend === 'declining'
                                ? 'bg-red-50 text-red-500'
                                : 'bg-gray-100 text-gray-400'
                        }`}>
                        {velocityTrend === 'improving'
                            ? <TrendingUp size={12} />
                            : velocityTrend === 'declining'
                                ? <TrendingDown size={12} />
                                : null}
                        {velocityTrend === 'improving'
                            ? 'Improving'
                            : velocityTrend === 'declining'
                                ? 'Declining'
                                : 'Insufficient Data'}
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end gap-3 h-40 mb-4">
                    {closedSprints.map((sprint, index) => {
                        const heightPercent = maxVelocity > 0
                            ? (sprint.velocity / maxVelocity) * 100
                            : 0;
                        const isBest = sprint.velocity ===
                            Math.max(...closedSprints.map(s => s.velocity));
                        return (
                            <div
                                key={index}
                                className="flex-1 flex flex-col items-center gap-2"
                            >
                                <span className="text-[10px] font-black text-[#2c3e50]">
                                    {sprint.velocity}
                                </span>
                                <div className="w-full relative group cursor-pointer">
                                    <div
                                        className="w-full rounded-t-lg transition-all duration-700 relative"
                                        style={{
                                            height: `${Math.max(heightPercent * 1.2, 8)}px`,
                                            backgroundColor: isBest ? '#18bc9c' : '#2c3e50'
                                        }}
                                    >
                                        {isBest && (
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#18bc9c] whitespace-nowrap">
                                                BEST ✓
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 text-center leading-tight">
                                    S{sprint.sprintNumber}
                                </span>
                            </div>
                        );
                    })}

                    {/* Current sprint (in progress) */}
                    {currentSprint && (
                        <div className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400">
                                {currentSprint.completedStoryPoints}
                            </span>
                            <div
                                className="w-full rounded-t-lg border-2 border-dashed border-gray-300"
                                style={{
                                    height: `${Math.max(
                                        ((currentSprint.completedStoryPoints || 0) /
                                            maxVelocity) * 120, 8
                                    )}px`,
                                    backgroundColor: '#f3f4f6'
                                }}
                            />
                            <span className="text-[9px] font-bold text-gray-400 text-center leading-tight">
                                Current
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <span className="text-xs text-gray-400">
                        Average velocity across all sprints
                    </span>
                    <span className="text-sm font-black text-[#2c3e50]">
                        {averageVelocity} pts/sprint
                    </span>
                </div>
            </div>

            {/* ── SPRINT HISTORY TABLE ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#2c3e50]" />
                    <h3 className="font-bold text-[#2c3e50]">Sprint Completion History</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Sprint</th>
                                <th className="px-6 py-3">Duration</th>
                                <th className="px-6 py-3 text-center">Velocity</th>
                                <th className="px-6 py-3 text-center">Completion</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {closedSprints.map((sprint, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#2c3e50]">
                                                {sprint.name}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                Sprint {sprint.sprintNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            <span>
                                                {sprint.startDate
                                                    ? new Date(sprint.startDate)
                                                        .toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })
                                                    : 'N/A'}
                                                {' - '}
                                                {sprint.endDate
                                                    ? new Date(sprint.endDate)
                                                        .toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-black text-[#2c3e50]">
                                            {sprint.velocity}
                                        </span>
                                        <span className="text-xs text-gray-400"> pts</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-sm font-black ${getCompletionColor(sprint.completionRate)}`}>
                                                {sprint.completionRate}%
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {sprint.completedPoints}/{sprint.totalPoints} pts
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${getCompletionBg(sprint.completionRate)}`}>
                                            {sprint.completionRate >= 90
                                                ? '✓ Complete'
                                                : sprint.completionRate >= 70
                                                    ? '⚠ Partial'
                                                    : '✗ Incomplete'}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {/* Current sprint row */}
                            {currentSprint && (
                                <tr className="border-b border-gray-50 bg-[#18bc9c]/5">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#2c3e50]">
                                                {currentSprint.name}
                                            </span>
                                            <span className="text-[10px] text-[#18bc9c] font-bold">
                                                In Progress
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            <span>
                                                {currentSprint.startDate
                                                    ? new Date(currentSprint.startDate)
                                                        .toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })
                                                    : 'N/A'}
                                                {' - '}
                                                {currentSprint.endDate
                                                    ? new Date(currentSprint.endDate)
                                                        .toLocaleDateString('en-GB', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-black text-[#18bc9c]">
                                            {currentSprint.completedStoryPoints}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            /{currentSprint.totalStoryPoints} pts
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-black text-[#18bc9c]">
                                            {currentSprint.totalStoryPoints > 0
                                                ? Math.round(
                                                    (currentSprint.completedStoryPoints /
                                                        currentSprint.totalStoryPoints) * 100
                                                )
                                                : 0}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-[#18bc9c]/10 text-[#18bc9c]">
                                            ⟳ Active
                                        </span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default SprintAnalytics;