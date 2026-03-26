import React, { useEffect } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingDown,
    Zap,
    ChevronRight,
    UserPlus,
    Shield,
    RefreshCw
} from 'lucide-react';
import useOverviewStore from '../../store/overviewStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// HELPER: Get icon for action type
// ─────────────────────────────────────────
const getActionIcon = (type) => {
    switch (type) {
        case 'OVERLOAD': return UserPlus;
        case 'DELAY': return Clock;
        case 'BLOCKED': return Shield;
        default: return AlertTriangle;
    }
};

// ─────────────────────────────────────────
// HELPER: Get color for action priority
// ─────────────────────────────────────────
const getActionColor = (priority) => {
    switch (priority) {
        case 'High': return 'bg-red-50 text-red-500';
        case 'Medium': return 'bg-blue-50 text-blue-500';
        default: return 'bg-gray-50 text-gray-500';
    }
};

// ─────────────────────────────────────────
// HELPER: Get health color
// ─────────────────────────────────────────
const getHealthColor = (score) => {
    if (score > 65) return '#18bc9c';
    if (score > 40) return '#f1c40f';
    return '#e74c3c';
};

// ─────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────
const SkeletonCard = ({ className = '' }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
);

const Overview = () => {
    const { overviewData, isLoading, error, fetchOverview } = useOverviewStore();
    const { selectedProject } = useAuthStore();

    useEffect(() => {
        fetchOverview();
    }, [selectedProject?.key]);

    // ── Loading State ──
    if (isLoading && !overviewData) {
        return (
            <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SkeletonCard />
                    <SkeletonCard className="lg:col-span-2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    // ── Error State ──
    if (error && !overviewData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="text-sm text-gray-500">{error}</p>
                <button
                    onClick={() => fetchOverview(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2c3e50] text-white rounded-xl text-xs font-bold"
                >
                    <RefreshCw size={14} /> Try Again
                </button>
            </div>
        );
    }

    // ── No Data State ──
    if (!overviewData) return null;

    const {
        sprintInfo,
        healthScore,
        topActions,
        teamWorkload,
        burndown,
        averageVelocity,
        cachedAt
    } = overviewData;

    const healthColor = getHealthColor(healthScore?.score || 0);
    const circumference = 440;
    const strokeDashoffset = circumference -
        (circumference * (healthScore?.score || 0)) / 100;

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">

            {/* ── SPRINT INFO BANNER ── */}
            {sprintInfo && (
                <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#18bc9c] animate-pulse" />
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Active Sprint
                            </p>
                            <p className="text-sm font-bold text-[#2c3e50]">
                                {sprintInfo.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                        <div className="flex flex-col items-center">
                            <span className="font-black text-[#2c3e50] text-lg">
                                {healthScore?.meta?.daysRemaining ?? 0}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">
                                Days Left
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-[#2c3e50] text-lg">
                                {sprintInfo.completedStoryPoints}
                                <span className="text-gray-400 font-medium text-sm">
                                    /{sprintInfo.totalStoryPoints}
                                </span>
                            </span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">
                                Points Done
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-[#2c3e50] text-lg">
                                {averageVelocity}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-gray-400">
                                Avg Velocity
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP ROW: HEALTH SCORE + AI ACTIONS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sprint Health Gauge */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                        Sprint Health Score
                    </h3>
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80" cy="80" r="70"
                                stroke="#f3f4f6" strokeWidth="12" fill="transparent"
                            />
                            <circle
                                cx="80" cy="80" r="70"
                                stroke={healthColor}
                                strokeWidth="12" fill="transparent"
                                strokeLinecap="round"
                                style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset,
                                    transition: 'stroke-dashoffset 1s ease'
                                }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-[#2c3e50]">
                                {healthScore?.score ?? 0}%
                            </span>
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100"
                                style={{ color: healthColor }}
                            >
                                {(healthScore?.status ?? 'Unknown').toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                        Overall project health is{' '}
                        <b>{healthScore?.status ?? 'Unknown'}</b>{' '}
                        based on current velocity and risk factors.
                    </p>
                    {healthScore?.meta?.inGracePeriod && (
                        <span className="mt-2 text-[10px] text-[#18bc9c] font-bold bg-[#18bc9c]/10 px-2 py-1 rounded-full">
                            Grace Period Active
                        </span>
                    )}
                </div>

                {/* AI Action Center */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap size={18} className="text-[#18bc9c]" />
                        <h3 className="font-bold text-[#2c3e50]">
                            AI Action Center: Top Priorities
                        </h3>
                    </div>

                    <div className="space-y-3 flex-1">
                        {topActions && topActions.length > 0 ? (
                            topActions.map((action, index) => {
                                const IconComponent = getActionIcon(action.type);
                                return (
                                    <div
                                        key={index}
                                        className="group flex items-center justify-between p-4 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-[#18bc9c]/30 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${getActionColor(action.priority)}`}>
                                                <IconComponent size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-[#2c3e50]">
                                                    {action.task}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    {action.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={18}
                                            className="text-gray-300 group-hover:text-[#18bc9c] transition-all shrink-0"
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                <CheckCircle2 size={32} className="mb-2 text-[#18bc9c]" />
                                <p className="text-sm font-medium">No critical actions needed</p>
                                <p className="text-xs">Sprint is on track</p>
                            </div>
                        )}
                    </div>

                    {cachedAt && (
                        <p className="text-[10px] text-gray-400 mt-4 text-right">
                            Last updated: {new Date(cachedAt).toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>

            {/* ── CHARTS ROW: WORKLOAD + BURNDOWN ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Team Workload Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-[#2c3e50]">
                            Team Workload Distribution
                        </h3>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                            THRESHOLD: 80%
                        </span>
                    </div>

                    <div className="space-y-6 relative">
                        {/* 80% threshold line */}
                        <div className="absolute left-[80%] top-0 bottom-0 border-l-2 border-dashed border-red-200 z-0" />

                        {teamWorkload && teamWorkload.length > 0 ? (
                            teamWorkload.map((member) => (
                                <div key={member.accountId} className="relative z-10">
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-[#2c3e50]">{member.name}</span>
                                        <span className={
                                            (member.actualPercentage || member.workloadPercentage) > 80
                                                ? 'text-red-500'
                                                : 'text-[#18bc9c]'
                                        }>
                                            {member.actualPercentage || member.workloadPercentage}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${member.workloadPercentage}%`,
                                                backgroundColor: member.status === 'Overloaded'
                                                    ? '#e74c3c'
                                                    : member.status === 'Warning'
                                                        ? '#f1c40f'
                                                        : '#18bc9c'
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-400">
                                            {member.taskCount} tasks · {member.totalPoints} pts
                                        </span>
                                        <span className={`text-[10px] font-bold ${member.status === 'Overloaded'
                                            ? 'text-red-400'
                                            : member.status === 'Warning'
                                                ? 'text-yellow-500'
                                                : 'text-[#18bc9c]'
                                            }`}>
                                            {member.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 text-center py-8">
                                No team data available
                            </p>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-6 italic">
                        * Members past the dashed line are at high risk of burnout.
                    </p>
                </div>

                {/* Sprint Burndown Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-[#2c3e50] mb-8">
                        Sprint Burndown ({sprintInfo?.name})
                    </h3>

                    {burndown && burndown.length > 0 ? (
                        <>
                            <div className="h-48 flex items-end justify-between gap-1 px-2">
                                {burndown
                                    .filter((_, i) => i % 2 === 0)
                                    .map((day) => {
                                        const maxVal = burndown[0]?.ideal || 100;
                                        const idealHeight = maxVal > 0
                                            ? (day.ideal / maxVal) * 150
                                            : 0;
                                        const actualHeight = day.actual !== null && maxVal > 0
                                            ? (day.actual / maxVal) * 150
                                            : null;
                                        return (
                                            <div
                                                key={day.day}
                                                className="flex-1 flex flex-col items-center gap-1"
                                            >
                                                <div className="w-full flex justify-center gap-0.5">
                                                    {actualHeight !== null && (
                                                        <div
                                                            className="w-2.5 bg-[#2c3e50] rounded-t-sm transition-all duration-700"
                                                            style={{ height: `${actualHeight}px` }}
                                                            title={`Actual: ${day.actual}pts`}
                                                        />
                                                    )}
                                                    <div
                                                        className="w-2.5 bg-gray-200 rounded-t-sm transition-all duration-700"
                                                        style={{ height: `${idealHeight}px` }}
                                                        title={`Ideal: ${day.ideal}pts`}
                                                    />
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-400">
                                                    {day.label.replace('Day ', 'D')}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div className="flex justify-center gap-6 mt-6">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                    <div className="w-3 h-3 bg-[#2c3e50] rounded-sm" />
                                    ACTUAL
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                    <div className="w-3 h-3 bg-gray-200 rounded-sm" />
                                    IDEAL
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-8">
                            No burndown data available
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Overview;