import React from 'react';
import {
    AlertCircle,
    Bell,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    Eye,
    Activity,
    MoreHorizontal
} from 'lucide-react';

// --- HIGH FIDELITY DUMMY DATA ---
const MONITORING_DATA = {
    health: {
        probability: 12,
        trend: '+4%', // increase in failure probability
        direction: 'up', // indicates risk is rising
        factors: [
            { name: 'Team Velocity', status: 'Decreasing', icon: Activity },
            { name: 'Remaining Work', status: 'High (40 pts)', icon: Clock },
            { name: 'Capacity', status: 'Stable (160h)', icon: Eye }
        ]
    },
    alerts: [
        {
            id: 1,
            type: 'Critical',
            title: 'Deadline Breach Predicted',
            msg: 'PROJ-12 is 3 days behind. AI predicts 85% chance of missing Friday milestone.',
            time: 'Just Now',
            color: '#e74c3c'
        },
        {
            id: 2,
            type: 'Warning',
            title: 'Workload Threshold Exceeded',
            msg: 'Alex has reached 92% capacity. Rule-based engine flags potential burnout.',
            time: '14 mins ago',
            color: '#f1c40f'
        },
        {
            id: 3,
            type: 'Info',
            title: 'Jira Sync Successful',
            msg: 'All 24 tasks synchronized. No new external blockers detected.',
            time: '1 hour ago',
            color: '#18bc9c'
        }
    ],
    liveFeed: [
        { time: '15:45', action: 'AI checked sprint velocity — no change detected.' },
        { time: '15:30', action: 'Agentic Engine validated PMBOK Rule #4 (Critical Path).' },
        { time: '15:12', action: 'Monitoring Alex\'s workload — 2 new Jira tickets assigned.' },
        { time: '14:55', action: 'Scanning for potential task dependencies conflicts...' },
    ]
};

const Monitoring = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* 1. HEADER */}
            <header>
                <h1 className="text-2xl font-bold text-[#2c3e50]">Monitoring & Alert Center</h1>
                <p className="text-sm text-gray-500 mt-1">Real-time background surveillance by ProManage AI Agent.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 2. SPRINT HEALTH MONITOR (Gauge + Context) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Failure Probability</h3>

                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                                <circle
                                    cx="80" cy="80" r="70" stroke="#e74c3c"
                                    strokeWidth="12" fill="transparent" strokeLinecap="round"
                                    style={{ strokeDasharray: 440, strokeDashoffset: 440 - (440 * MONITORING_DATA.health.probability) / 100 }}
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-black text-[#2c3e50]">{MONITORING_DATA.health.probability}%</span>
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${MONITORING_DATA.health.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                                    {MONITORING_DATA.health.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {MONITORING_DATA.health.trend} vs Yesterday
                                </div>
                            </div>
                        </div>

                        <div className="w-full mt-10 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">Risk Calculation Basis</p>
                            {MONITORING_DATA.health.factors.map(factor => (
                                <div key={factor.name} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <factor.icon size={14} className="text-gray-400" />
                                        <span className="text-xs font-bold text-[#2c3e50]">{factor.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{factor.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. LIVE AGENT ACTIVITY (Pulse Feed) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#18bc9c] animate-pulse" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Live Agent Activity Feed</h3>
                            </div>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded">MODULE 10: ACTIVE</span>
                        </div>

                        <div className="flex-1 space-y-4 font-mono text-xs">
                            {MONITORING_DATA.liveFeed.map((log, i) => (
                                <div key={i} className="flex gap-4 opacity-80 hover:opacity-100 transition-opacity">
                                    <span className="text-[#18bc9c] shrink-0">[{log.time}]</span>
                                    <span className="text-gray-300">Agentic AI: {log.action}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] italic text-gray-400">The AI Co-Pilot continuously observes Jira events and local workload data to trigger alerts.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. SMART ALERT CENTER (Actionable Cards) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="text-[#2c3e50]" size={18} />
                        <h3 className="font-bold text-[#2c3e50]">Actionable Smart Alerts</h3>
                    </div>
                    <button className="text-[10px] font-bold text-gray-400 uppercase hover:text-[#2c3e50]">Clear All</button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {MONITORING_DATA.alerts.map(alert => (
                        <div key={alert.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-8 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-md`} style={{ borderColor: alert.color }}>
                            <div className="flex gap-4 items-start">
                                <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: `${alert.color}15` }}>
                                    <AlertCircle size={20} style={{ color: alert.color }} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase" style={{ color: alert.color }}>{alert.type}</span>
                                        <span className="text-gray-300 text-[10px]">•</span>
                                        <span className="text-gray-400 text-[10px]">{alert.time}</span>
                                    </div>
                                    <h4 className="font-bold text-[#2c3e50] text-sm mb-1">{alert.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">{alert.msg}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                <button className="px-4 py-2 bg-[#2c3e50] text-white text-[10px] font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-1">
                                    <CheckCircle size={12} /> Resolve
                                </button>
                                <button className="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-bold rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1">
                                    <Clock size={12} /> Snooze
                                </button>
                                <button className="p-2 border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50">
                                    <MoreHorizontal size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default Monitoring;