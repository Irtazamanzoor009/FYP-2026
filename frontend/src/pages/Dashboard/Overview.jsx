import React from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingDown,
    Zap,
    ChevronRight,
    UserPlus
} from 'lucide-react';

// --- HIGH FIDELITY DUMMY DATA ---
const SPRINT_DATA = {
    healthScore: 72, // 0-100
    healthStatus: "At Risk", // Healthy, At Risk, Critical
    actions: [
        { id: 1, priority: 'High', task: 'John Doe is overloaded (95%)', desc: 'Reassign 2 tasks from Sprint 4 to Sarah Khan.', icon: UserPlus },
        { id: 2, priority: 'Medium', task: 'PROJ-44 Delay Alert', desc: 'Backend API is 2 days behind. Review blockers now.', icon: Clock },
        { id: 3, priority: 'Low', task: 'Unresolved Risks', desc: '4 risks detected in critical path. Update mitigation plan.', icon: AlertTriangle },
    ],
    workload: [
        { name: 'John Doe', load: 95, status: 'Overloaded' },
        { name: 'Sarah Khan', load: 62, status: 'Optimal' },
        { name: 'Mike Ross', load: 45, status: 'Underloaded' },
        { name: 'Emma Wilson', load: 88, status: 'Warning' }
    ],
    burndown: [
        { day: 'M', ideal: 100, actual: 100 },
        { day: 'T', ideal: 80, actual: 85 },
        { day: 'W', ideal: 60, actual: 75 },
        { day: 'T', ideal: 40, actual: 55 },
        { day: 'F', ideal: 20, actual: 50 }, // Gap shows we are behind
    ]
};

const Overview = () => {
    // Logic for Health Color
    const getHealthColor = (score) => {
        if (score > 80) return '#18bc9c'; // Green
        if (score > 60) return '#f1c40f'; // Yellow
        return '#e74c3c'; // Red
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">

            {/* 1. TOP HEADER & HEALTH SCORE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sprint Health Gauge */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Sprint Health Score</h3>
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                            <circle
                                cx="80" cy="80" r="70" stroke={getHealthColor(SPRINT_DATA.healthScore)}
                                strokeWidth="12" fill="transparent" strokeLinecap="round"
                                style={{ strokeDasharray: 440, strokeDashoffset: 440 - (440 * SPRINT_DATA.healthScore) / 100 }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-[#2c3e50]">{SPRINT_DATA.healthScore}%</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100" style={{ color: getHealthColor(SPRINT_DATA.healthScore) }}>
                                {SPRINT_DATA.healthStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                        Overall project health is <b>{SPRINT_DATA.healthStatus}</b> based on current velocity and risk factors.
                    </p>
                </div>

                {/* Top 3 Actions Needed Today (AI Action Center) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap size={18} className="text-[#18bc9c]" />
                        <h3 className="font-bold text-[#2c3e50]">AI Action Center: Top Priorities</h3>
                    </div>

                    <div className="space-y-3 flex-1">
                        {SPRINT_DATA.actions.map((action) => (
                            <div key={action.id} className="group flex items-center justify-between p-4 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-[#18bc9c]/30 hover:shadow-md transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${action.priority === 'High' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                        <action.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[#2c3e50]">{action.task}</h4>
                                        <p className="text-xs text-gray-500">{action.desc}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-[#18bc9c] transition-all" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Improved Workload Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-[#2c3e50] flex items-center gap-2">Team Workload Distribution</h3>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">THRESHOLD: 80%</span>
                    </div>

                    <div className="space-y-6 relative">
                        {/* 80% Threshold Vertical Line */}
                        <div className="absolute left-[80%] top-0 bottom-0 border-l-2 border-dashed border-red-200 z-0"></div>

                        {SPRINT_DATA.workload.map((member) => (
                            <div key={member.name} className="relative z-10">
                                <div className="flex justify-between text-xs font-bold mb-2">
                                    <span className="text-[#2c3e50]">{member.name}</span>
                                    <span className={member.load > 80 ? 'text-red-500' : 'text-[#18bc9c]'}>{member.load}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${member.load}%`,
                                            backgroundColor: member.load > 80 ? '#e74c3c' : '#18bc9c'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-6 italic">* Members past the dashed line are at high risk of burnout.</p>
                </div>

                {/* Sprint Burndown Mini-Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-[#2c3e50] mb-8">Sprint Burndown (Sprint 4)</h3>

                    <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {SPRINT_DATA.burndown.map((day) => (
                            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full flex justify-center gap-1">
                                    {/* Actual Work Remaining Bar */}
                                    <div
                                        className="w-3 bg-[#2c3e50] rounded-t-sm transition-all duration-700"
                                        style={{ height: `${day.actual * 1.5}px` }}
                                        title={`Actual: ${day.actual}%`}
                                    />
                                    {/* Ideal Burndown Bar */}
                                    <div
                                        className="w-3 bg-gray-200 rounded-t-sm transition-all duration-700"
                                        style={{ height: `${day.ideal * 1.5}px` }}
                                        title={`Ideal: ${day.ideal}%`}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">{day.day}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center gap-6 mt-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                            <div className="w-3 h-3 bg-[#2c3e50] rounded-sm" /> ACTUAL
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                            <div className="w-3 h-3 bg-gray-200 rounded-sm" /> IDEAL
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Overview;