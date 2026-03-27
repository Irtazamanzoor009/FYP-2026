import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Zap,
    ArrowRight,
    Calendar,
    ChevronDown,
    Loader2,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import useRiskStore from '../../store/riskStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// Risk level color helpers
// ─────────────────────────────────────────
const getRiskColor = (level) => {
    if (level === 'CRITICAL') return '#e74c3c';
    if (level === 'HIGH') return '#e67e22';
    if (level === 'MEDIUM') return '#f1c40f';
    return '#18bc9c';
};

const getProbabilityColor = (prob) => {
    if (prob > 60) return '#18bc9c';
    if (prob > 30) return '#f1c40f';
    return '#e74c3c';
};

const RiskAnalytics = () => {
    const {
        riskData,
        whatIfResult,
        mitigationPlan,
        isLoading,
        isSimulating,
        isGeneratingPlan,
        fetchRiskData,
        refreshRiskData,
        runWhatIf,
        generateMitigationPlan
    } = useRiskStore();

    const { selectedProject } = useAuthStore();
    const [scenario, setScenario] = useState('NONE');
    const [showPlan, setShowPlan] = useState(false);

    useEffect(() => {
        fetchRiskData();
    }, [selectedProject?.key]);

    const handleScenarioChange = async (e) => {
        const val = e.target.value;
        setScenario(val);
        await runWhatIf(val);
    };

    const handleMitigationPlan = async () => {
        setShowPlan(true);
        const tid = toast.loading('Generating mitigation plan...');
        await generateMitigationPlan();
        toast.success('Plan generated!', { id: tid });
    };

    const handleRefresh = async () => {
        const tid = toast.loading('Refreshing risk data...');
        const res = await refreshRiskData();
        if (res.success) toast.success('Risk data updated!', { id: tid });
        else toast.error('Refresh failed', { id: tid });
    };

    // Loading state
    if (isLoading && !riskData) {
        return (
            <div className="flex items-center justify-center h-64 gap-3">
                <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                <span className="text-sm text-gray-500">Analyzing risks...</span>
            </div>
        );
    }

    if (!riskData) return null;

    const {
        risks,
        timeline,
        sprintSuccessProbability,
        whatIfResults
    } = riskData;

    // Use live what-if result or pre-calculated
    const activeWhatIf = whatIfResult ||
        whatIfResults?.find(r => r.scenario === scenario) ||
        whatIfResults?.find(r => r.scenario === 'NONE');

    const displayProbability = activeWhatIf?.newProbability ?? sprintSuccessProbability;
    const displayColor = getProbabilityColor(displayProbability);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Risk Analysis & Prediction</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        AI-driven predictive modeling of potential project failures.
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all shadow-sm"
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    Refresh Analysis
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* What-If Simulator */}
                <div className="lg:col-span-1 bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                        <Zap className="text-[#18bc9c]" size={20} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">
                            What-If? Simulator
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">
                                Select Scenario
                            </label>
                            <div className="relative">
                                <select
                                    value={scenario}
                                    onChange={handleScenarioChange}
                                    disabled={isSimulating}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#18bc9c] appearance-none cursor-pointer disabled:opacity-60"
                                >
                                    <option value="NONE" className="bg-[#2c3e50]">
                                        No Scenario Active
                                    </option>
                                    <option value="MEMBER_LEAVES" className="bg-[#2c3e50]">
                                        Lead Developer takes sick leave
                                    </option>
                                    <option value="SCOPE_CREEP" className="bg-[#2c3e50]">
                                        Client adds 3 new features
                                    </option>
                                    <option value="DEADLINE_EARLIER" className="bg-[#2c3e50]">
                                        Deadline moved 3 days earlier
                                    </option>
                                </select>
                                <ChevronDown
                                    className="absolute right-3 top-3.5 text-gray-400 pointer-events-none"
                                    size={16}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <h4 className="text-xs font-bold text-gray-400 mb-4">
                                Sprint Success Probability
                            </h4>
                            {isSimulating ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 size={32} className="animate-spin text-[#18bc9c]" />
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="text-5xl font-black transition-all duration-500"
                                        style={{ color: displayColor }}
                                    >
                                        {displayProbability}%
                                    </div>
                                    {activeWhatIf && scenario !== 'NONE' && (
                                        <div className={`text-xs mt-2 font-bold ${activeWhatIf.change < 0
                                                ? 'text-red-400'
                                                : 'text-[#18bc9c]'
                                            }`}>
                                            {activeWhatIf.change > 0 ? '+' : ''}
                                            {activeWhatIf.change}% from baseline
                                        </div>
                                    )}
                                    <p className="text-[10px] mt-4 text-gray-400 leading-relaxed italic">
                                        {activeWhatIf?.recommendation ||
                                            'System stable. No external threats detected.'}
                                    </p>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleMitigationPlan}
                            disabled={isGeneratingPlan}
                            className="w-full py-3 bg-[#18bc9c] text-white font-bold rounded-xl text-xs hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isGeneratingPlan
                                ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                : 'Generate Mitigation Plan'
                            }
                        </button>

                        {/* Mitigation Plan */}
                        {showPlan && mitigationPlan && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <h4 className="text-[10px] font-black text-[#18bc9c] uppercase mb-3">
                                    Mitigation Plan
                                </h4>
                                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                                    {mitigationPlan.plan}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Risk Vulnerability Cards */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="text-red-500" size={18} />
                        <h3 className="font-bold text-[#2c3e50]">Identified Vulnerabilities</h3>
                    </div>

                    {risks && risks.length > 0 ? (
                        risks.map((risk, index) => {
                            const color = getRiskColor(risk.level);
                            return (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6"
                                >
                                    <div className="flex flex-col items-center justify-center shrink-0 w-20">
                                        <span
                                            className="text-2xl font-black"
                                            style={{ color }}
                                        >
                                            {risk.score}%
                                        </span>
                                        <span
                                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-50 mt-1"
                                            style={{ color }}
                                        >
                                            {risk.level}
                                        </span>
                                        <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold">
                                            {risk.type}
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                    Why it happened
                                                </h4>
                                                <p className="text-xs text-[#2c3e50] leading-relaxed">
                                                    {risk.why}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                    AI Recommendation
                                                </h4>
                                                <div className="flex items-start gap-2">
                                                    <ArrowRight
                                                        size={14}
                                                        className="text-[#18bc9c] mt-0.5 shrink-0"
                                                    />
                                                    <p className="text-xs text-[#18bc9c] font-bold italic leading-relaxed">
                                                        {risk.action}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Affected issues */}
                                        {risk.affectedIssues?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {risk.affectedIssues.slice(0, 3).map((issue, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold"
                                                    >
                                                        {issue.key}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-gray-100">
                            <ShieldAlert size={32} className="text-[#18bc9c]" />
                            <p className="text-sm text-gray-500">No significant risks detected</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Predictive Risk Timeline */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-8">
                    <Calendar className="text-[#2c3e50]" size={18} />
                    <h3 className="font-bold text-[#2c3e50]">Predictive Risk Timeline</h3>
                </div>

                {timeline && timeline.length > 0 ? (
                    <div className="relative pt-8 pb-4 overflow-x-auto">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
                        <div className="flex justify-between items-center relative z-10 min-w-[600px]">
                            {timeline.map((day, i) => {
                                const hasRisk = day.hasRisk;
                                const severity = day.highestSeverity;
                                const dotColor = !hasRisk
                                    ? '#e5e7eb'
                                    : severity === 'CRITICAL'
                                        ? '#e74c3c'
                                        : severity === 'HIGH'
                                            ? '#e67e22'
                                            : '#f1c40f';

                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center group cursor-pointer"
                                    >
                                        <div className="relative mb-4">
                                            <div
                                                className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                                                style={{
                                                    backgroundColor: dotColor,
                                                    boxShadow: hasRisk
                                                        ? `0 0 8px ${dotColor}`
                                                        : 'none'
                                                }}
                                            />
                                            {hasRisk && day.riskEvents?.[0] && (
                                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2c3e50] text-white px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    {day.riskEvents[0].label}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                                            D{day.day}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 text-center py-8">
                        No timeline data available
                    </p>
                )}

                {/* Timeline legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-50">
                    {[
                        { color: '#e74c3c', label: 'Critical Risk' },
                        { color: '#e67e22', label: 'High Risk' },
                        { color: '#f1c40f', label: 'Medium Risk' },
                        { color: '#e5e7eb', label: 'No Risk' }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[10px] text-gray-500 font-bold">
                                {item.label}
                            </span>
                        </div>
                    ))}
                    <p className="text-[10px] text-gray-400 ml-auto italic">
                        Hover over dots to see risk details
                    </p>
                </div>
            </div>

        </div>
    );
};

export default RiskAnalytics;