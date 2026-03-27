import React, { useEffect, useState } from 'react';
import {
    AlertCircle,
    Bell,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    Eye,
    Activity,
    MoreHorizontal,
    Loader2,
    RefreshCw,
    Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import useMonitoringStore from '../../store/monitoringStore';
import useAuthStore from '../../store/authStore';

// ─────────────────────────────────────────
// Alert severity colors
// ─────────────────────────────────────────
const getAlertColor = (severity) => {
    if (severity === 'CRITICAL') return '#e74c3c';
    if (severity === 'WARNING') return '#f1c40f';
    return '#18bc9c';
};

// ─────────────────────────────────────────
// Factor icon
// ─────────────────────────────────────────
const FactorIcon = ({ iconName }) => {
    const icons = {
        Activity: <Activity size={14} className="text-gray-400" />,
        Clock: <Clock size={14} className="text-gray-400" />,
        Eye: <Eye size={14} className="text-gray-400" />
    };
    return icons[iconName] || <Activity size={14} className="text-gray-400" />;
};

const Monitoring = () => {
    const {
        monitoringData,
        isLoading,
        isChecking,
        fetchMonitoringData,
        triggerManualCheck,
        resolveAlert,
        snoozeAlert,
        clearResolvedAlerts
    } = useMonitoringStore();

    const { selectedProject, user } = useAuthStore();
    const [snoozeDropdown, setSnoozeDropdown] = useState(null);

    useEffect(() => {
        fetchMonitoringData();
    }, [selectedProject?.key]);

    const handleManualCheck = async () => {
        const tid = toast.loading('Running monitoring checks...');
        const res = await triggerManualCheck();
        if (res.success) toast.success('Check complete!', { id: tid });
        else toast.error('Check failed', { id: tid });
    };

    const handleResolve = async (alertId, title) => {
        const res = await resolveAlert(alertId);
        if (res.success) toast.success(`"${title}" resolved`, { icon: '✅' });
        else toast.error('Failed to resolve alert');
    };

    const handleSnooze = async (alertId, minutes, title) => {
        setSnoozeDropdown(null);
        const res = await snoozeAlert(alertId, minutes);
        if (res.success) {
            toast.success(`"${title}" snoozed for ${minutes} min`, { icon: '😴' });
        } else {
            toast.error('Failed to snooze alert');
        }
    };

    const handleClearResolved = async () => {
        const res = await clearResolvedAlerts();
        if (res.success) {
            toast.success(`${res.data?.deletedCount || 0} resolved alerts cleared`);
        }
    };

    if (isLoading && !monitoringData) {
        return (
            <div className="flex items-center justify-center h-64 gap-3">
                <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                <span className="text-sm text-gray-500">Loading monitoring data...</span>
            </div>
        );
    }

    if (!monitoringData) return null;

    const {
        failureProbability,
        factors,
        alerts,
        agentLogs,
        lastCheckedAt
    } = monitoringData;

    const circumference = 440;
    const prob = failureProbability?.current ?? 0;
    const strokeDashoffset = circumference - (circumference * prob) / 100;
    const probColor = prob > 60 ? '#e74c3c' : prob > 30 ? '#f1c40f' : '#18bc9c';

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Monitoring & Alert Center</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time background surveillance by ProManage AI Agent.
                    </p>
                </div>
                <button
                    onClick={handleManualCheck}
                    disabled={isChecking}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all shadow-sm disabled:opacity-60"
                >
                    <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                    {isChecking ? 'Checking...' : 'Run Check Now'}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Failure Probability Gauge */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
                            Failure Probability
                        </h3>

                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="80" cy="80" r="70"
                                    stroke="#f3f4f6" strokeWidth="12" fill="transparent"
                                />
                                <circle
                                    cx="80" cy="80" r="70"
                                    stroke={probColor}
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
                                <span className="text-4xl font-black text-[#2c3e50]">{prob}%</span>
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${failureProbability?.direction === 'up'
                                        ? 'text-red-500'
                                        : failureProbability?.direction === 'down'
                                            ? 'text-[#18bc9c]'
                                            : 'text-gray-400'
                                    }`}>
                                    {failureProbability?.direction === 'up'
                                        ? <TrendingUp size={12} />
                                        : failureProbability?.direction === 'down'
                                            ? <TrendingDown size={12} />
                                            : <Minus size={12} />
                                    }
                                    {failureProbability?.trend || '+0%'} vs Yesterday
                                </div>
                            </div>
                        </div>

                        {/* Risk factors */}
                        <div className="w-full mt-10 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-4">
                                Risk Calculation Basis
                            </p>
                            {factors?.map(factor => (
                                <div
                                    key={factor.name}
                                    className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <FactorIcon iconName={factor.icon} />
                                        <span className="text-xs font-bold text-[#2c3e50]">
                                            {factor.name}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">{factor.status}</span>
                                </div>
                            ))}
                        </div>

                        {lastCheckedAt && (
                            <p className="text-[10px] text-gray-400 mt-4 text-center">
                                Last sync: {new Date(lastCheckedAt).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Live Agent Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#18bc9c] animate-pulse" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">
                                    Live Agent Activity Feed
                                </h3>
                            </div>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded">
                                MODULE 10: ACTIVE
                            </span>
                        </div>

                        <div className="flex-1 space-y-4 font-mono text-xs overflow-y-auto max-h-64">
                            {agentLogs && agentLogs.length > 0 ? (
                                agentLogs.map((logEntry, i) => (
                                    <div
                                        key={logEntry._id || i}
                                        className="flex gap-4 opacity-80 hover:opacity-100 transition-opacity"
                                    >
                                        <span className="text-[#18bc9c] shrink-0">
                                            [{logEntry.time}]
                                        </span>
                                        <span className="text-gray-300 break-words">
                                            {logEntry.message}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 text-xs italic">
                                        No agent activity yet. Run a check to see logs.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] italic text-gray-400">
                                The AI Co-Pilot continuously observes Jira events and
                                local workload data to trigger alerts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Alerts */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="text-[#2c3e50]" size={18} />
                        <h3 className="font-bold text-[#2c3e50]">Actionable Smart Alerts</h3>
                        {alerts?.length > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full">
                                {alerts.length} Active
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleClearResolved}
                        className="text-[10px] font-bold text-gray-400 uppercase hover:text-[#2c3e50] transition-colors"
                    >
                        Clear Resolved
                    </button>
                </div>

                {(!alerts || alerts.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-gray-100">
                        <CheckCircle size={32} className="text-[#18bc9c]" />
                        <p className="text-sm text-gray-500">No active alerts</p>
                        <p className="text-xs text-gray-400">
                            Sprint is being monitored. All clear.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    {alerts?.map(alert => {
                        const color = getAlertColor(alert.severity);
                        return (
                            <div
                                key={alert._id}
                                className="bg-white rounded-2xl p-5 shadow-sm border-l-8 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-md"
                                style={{ borderColor: color }}
                            >
                                <div className="flex gap-4 items-start w-full md:w-auto">
                                    <div
                                        className="p-3 rounded-full shrink-0"
                                        style={{ backgroundColor: `${color}15` }}
                                    >
                                        <AlertCircle size={20} style={{ color }} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[10px] font-black uppercase"
                                                style={{ color }}
                                            >
                                                {alert.severity}
                                            </span>
                                            <span className="text-gray-300 text-[10px]">•</span>
                                            <span className="text-gray-400 text-[10px]">
                                                {alert.createdAt
                                                    ? new Date(alert.createdAt)
                                                        .toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                    : ''}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-[#2c3e50] text-sm mb-1">
                                            {alert.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            {alert.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0 relative">
                                    <button
                                        onClick={() => handleResolve(alert._id, alert.title)}
                                        className="px-4 py-2 bg-[#2c3e50] text-white text-[10px] font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-1"
                                    >
                                        <CheckCircle size={12} /> Resolve
                                    </button>
                                    <button
                                        onClick={() => setSnoozeDropdown(
                                            snoozeDropdown === alert._id ? null : alert._id
                                        )}
                                        className="px-4 py-2 border border-gray-200 text-gray-500 text-[10px] font-bold rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1"
                                    >
                                        <Clock size={12} /> Snooze
                                    </button>
                                    {snoozeDropdown === alert._id && (
                                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 w-36">
                                            {[30, 60, 120].map(min => (
                                                <button
                                                    key={min}
                                                    onClick={() => handleSnooze(
                                                        alert._id, min, alert.title
                                                    )}
                                                    className="w-full px-4 py-2 text-xs text-left hover:bg-gray-50 text-[#2c3e50] font-medium"
                                                >
                                                    {min} minutes
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <button className="p-2 border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50">
                                        <MoreHorizontal size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Monitoring;