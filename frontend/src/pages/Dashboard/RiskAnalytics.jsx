import React, { useState } from 'react';
import {
    ShieldAlert,
    Info,
    Zap,
    ArrowRight,
    AlertCircle,
    Calendar,
    Users,
    Clock,
    ChevronDown
} from 'lucide-react';

// --- HIGH FIDELITY DUMMY DATA ---
const RISK_DATA = [
    {
        id: 1,
        type: 'Overload',
        level: 'Critical',
        score: 88,
        why: 'Lead developer John has 3 high-priority tasks overlapping in Day 8-10.',
        action: 'Move "API Documentation" (PROJ-45) to Sarah Khan to balance load.',
        color: '#e74c3c'
    },
    {
        id: 2,
        type: 'Bottleneck',
        level: 'High',
        score: 94,
        why: 'Backend PR is blocked by missing security credentials from the client.',
        action: 'Escalate to Client Success Manager immediately to avoid 3-day stall.',
        color: '#e67e22'
    },
    {
        id: 3,
        type: 'Deadline',
        level: 'Medium',
        score: 45,
        why: 'Current velocity is 5% lower than required to meet Friday deadline.',
        action: 'Drop "Secondary UI Polish" (PROJ-99) from this sprint to ensure core delivery.',
        color: '#f1c40f'
    }
];

const TIMELINE_DATA = [
    { day: 'Day 5', risk: 'Security Auth Delay', type: 'Bottleneck' },
    { day: 'Day 8', risk: 'Dev Burnout Peak', type: 'Overload' },
    { day: 'Day 12', risk: 'QA Congestion', type: 'Deadline' },
];

const RiskAnalytics = () => {
    // Simulator State
    const [scenario, setScenario] = useState('none');
    const [prob, setProb] = useState(72); // Default health

    const handleSimulate = (e) => {
        const val = e.target.value;
        setScenario(val);
        if (val === 'member_sick') setProb(35);
        else if (val === 'scope_creep') setProb(48);
        else if (val === 'deadline_move') setProb(15);
        else setProb(72);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* 1. HEADER */}
            <header>
                <h1 className="text-2xl font-bold text-[#2c3e50]">Risk Analysis & Prediction</h1>
                <p className="text-sm text-gray-500 mt-1">AI-driven predictive modeling of potential project failures.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 2. AI STRATEGY SIMULATOR (Interative Widget) */}
                <div className="lg:col-span-1 bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                        <Zap className="text-[#18bc9c]" size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">What-If? Simulator</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Select Scenario</label>
                            <div className="relative">
                                <select
                                    onChange={handleSimulate}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#18bc9c] appearance-none cursor-pointer"
                                >
                                    <option value="none" className="bg-[#2c3e50]">No Scenario Active</option>
                                    <option value="member_sick" className="bg-[#2c3e50]">Lead Developer takes sick leave</option>
                                    <option value="scope_creep" className="bg-[#2c3e50]">Client adds 3 new features</option>
                                    <option value="deadline_move" className="bg-[#2c3e50]">Deadline moved 3 days earlier</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <h4 className="text-xs font-bold text-gray-400 mb-4">Sprint Success Probability</h4>
                            <div className="text-5xl font-black transition-all duration-500" style={{ color: prob > 60 ? '#18bc9c' : prob > 30 ? '#f1c40f' : '#e74c3c' }}>
                                {prob}%
                            </div>
                            <p className="text-[10px] mt-4 text-gray-400 leading-relaxed italic">
                                {scenario === 'none' ? "System stable. No external threats detected." : `Predictive Analysis: ${scenario.replace('_', ' ')} will drastically impact velocity.`}
                            </p>
                        </div>

                        <button className="w-full py-3 bg-[#18bc9c] text-white font-bold rounded-xl text-xs hover:opacity-90 transition-all">
                            Generate Mitigation Plan
                        </button>
                    </div>
                </div>

                {/* 3. RISK CONTEXT CARDS */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="text-red-500" size={18} />
                        <h3 className="font-bold text-[#2c3e50]">Identified Vulnerabilities</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        {RISK_DATA.map((risk) => (
                            <div key={risk.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                                <div className="flex flex-col items-center justify-center shrink-0 w-20">
                                    <span className="text-2xl font-black" style={{ color: risk.color }}>{risk.score}%</span>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-50 mt-1" style={{ color: risk.color }}>
                                        {risk.level}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Why it happened</h4>
                                            <p className="text-xs text-[#2c3e50] leading-relaxed">{risk.why}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Recommendation</h4>
                                            <div className="flex items-start gap-2">
                                                <ArrowRight size={14} className="text-[#18bc9c] mt-0.5 shrink-0" />
                                                <p className="text-xs text-[#18bc9c] font-bold italic leading-relaxed">{risk.action}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. RISK TIMELINE */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-8">
                    <Calendar className="text-[#2c3e50]" size={18} />
                    <h3 className="font-bold text-[#2c3e50]">Predictive Risk Timeline</h3>
                </div>

                <div className="relative pt-8 pb-4">
                    {/* Horizontal Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full" />

                    <div className="flex justify-between items-center relative z-10">
                        {[...Array(14)].map((_, i) => {
                            const dayLabel = `Day ${i + 1}`;
                            const riskPoint = TIMELINE_DATA.find(d => d.day === dayLabel);

                            return (
                                <div key={i} className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full mb-4 ${riskPoint ? 'bg-[#e74c3c] scale-150 shadow-lg shadow-red-200' : 'bg-gray-200'}`} />
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{dayLabel}</span>

                                    {riskPoint && (
                                        <div className="absolute -top-6 bg-[#2c3e50] text-white px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap">
                                            {riskPoint.risk}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default RiskAnalytics;