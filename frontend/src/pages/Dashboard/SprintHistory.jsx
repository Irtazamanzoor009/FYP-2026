import React, { useEffect, useState } from 'react';
import API from '../../API/API';
import {
    TrendingUp, XCircle, Clock,
    BarChart3, Loader2, ChevronDown,
    ChevronUp, CheckCircle2, BrainCircuit
} from 'lucide-react';

const SprintHistory = () => {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);

    useEffect(() => {
        fetchHistory();
        fetchModelInfo();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await API.get('/sprint-planner/history');
            if (res.data.success) setPlans(res.data.data);
        } catch (err) {
            console.error('Failed to fetch sprint history');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchModelInfo = async () => {
        try {
            const res = await API.get('/sprint-planner/duration-model-info');
            if (res.data.success) setModelInfo(res.data.data);
        } catch {}
    };

    const getAccuracyInfo = (predicted, actual) => {
        if (!actual || !predicted) return {
            label: 'Pending',
            color: 'text-gray-400',
            bg: 'bg-gray-50'
        };
        const diff = Math.abs(predicted - actual) / predicted;
        if (diff <= 0.15) return {
            label: '✅ Accurate',
            color: 'text-green-600',
            bg: 'bg-green-50'
        };
        if (diff <= 0.35) return {
            label: '⚠️ Close',
            color: 'text-yellow-600',
            bg: 'bg-yellow-50'
        };
        return {
            label: '❌ Off',
            color: 'text-red-500',
            bg: 'bg-red-50'
        };
    };

    const getOutcomeStyle = (outcome) => {
        if (outcome === 'SUCCESS')
            return 'bg-green-100 text-green-700';
        if (outcome === 'PARTIAL')
            return 'bg-yellow-100 text-yellow-700';
        if (outcome === 'FAILED')
            return 'bg-red-100 text-red-600';
        return 'bg-gray-100 text-gray-500';
    };

    const getStatusStyle = (status) => {
        if (status === 'COMPLETED')
            return 'bg-green-50 text-green-600';
        if (status === 'PUSHED_TO_JIRA')
            return 'bg-blue-50 text-blue-600';
        return 'bg-gray-100 text-gray-500';
    };

    const getTypeColor = (taskType) => {
        const colors = {
            backend: 'bg-blue-50 text-blue-600',
            frontend: 'bg-pink-50 text-pink-600',
            testing: 'bg-yellow-50 text-yellow-600',
            general: 'bg-gray-100 text-gray-500'
        };
        return colors[taskType] || colors.general;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64
                gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                Loading sprint history...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between
                items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">
                        Sprint Planning History
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        ML predictions vs actual outcomes.
                        Model improves with every completed sprint.
                    </p>
                </div>

                {/* Model Status Badge */}
                {modelInfo && (
                    <div className={`flex items-center gap-2 px-4 py-2
                        rounded-xl border text-xs font-bold ${
                        modelInfo.active_model === 'personal'
                            ? 'bg-[#18bc9c]/10 text-[#18bc9c] border-[#18bc9c]/20'
                            : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                    }`}>
                        <BrainCircuit size={14} />
                        {modelInfo.active_model === 'personal'
                            ? `🎯 Personal Model Active`
                            : '🌍 Global Baseline Model'
                        }
                        {modelInfo.mae && (
                            <span className="opacity-70">
                                · MAE {modelInfo.mae}d
                            </span>
                        )}
                    </div>
                )}
            </header>

            {/* Model Explanation Banner */}
            <div className="bg-[#2c3e50]/5 rounded-2xl p-5 border
                border-[#2c3e50]/10">
                <h3 className="font-bold text-[#2c3e50] text-sm
                    flex items-center gap-2 mb-2">
                    <BrainCircuit size={14} className="text-[#18bc9c]" />
                    How the Duration Model Learns
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs
                    text-gray-500">
                    <div className="flex items-start gap-2">
                        <span className="text-[#18bc9c] font-bold mt-0.5">1</span>
                        <p>
                            <strong className="text-[#2c3e50]">
                                Plan with our tool
                            </strong> —
                            ML predicts task durations before sprint starts
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#18bc9c] font-bold mt-0.5">2</span>
                        <p>
                            <strong className="text-[#2c3e50]">
                                Sprint completes
                            </strong> —
                            System captures actual days from Jira automatically
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-[#18bc9c] font-bold mt-0.5">3</span>
                        <p>
                            <strong className="text-[#2c3e50]">
                                Model retrains
                            </strong> —
                            Real data makes future predictions more accurate
                        </p>
                    </div>
                </div>
            </div>

            {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center
                    py-16 bg-white rounded-2xl border border-gray-100 gap-4">
                    <BarChart3 size={48} className="text-gray-200" />
                    <div className="text-center">
                        <p className="text-gray-500 font-bold">
                            No sprint plans yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Plan and push a sprint using the Sprint Planner
                            to see history and ML accuracy here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {plans.map(plan => (
                        <div
                            key={plan._id}
                            className="bg-white rounded-2xl border
                                border-gray-100 shadow-sm overflow-hidden"
                        >
                            {/* Sprint Card Header */}
                            <div
                                className="flex items-center justify-between
                                    p-6 cursor-pointer hover:bg-gray-50
                                    transition-colors"
                                onClick={() => setExpanded(
                                    expanded === plan._id ? null : plan._id
                                )}
                            >
                                <div className="flex items-center gap-3
                                    flex-wrap">
                                    <div>
                                        <h3 className="font-bold
                                            text-[#2c3e50] text-sm">
                                            {plan.sprintName}
                                        </h3>
                                        <p className="text-[10px]
                                            text-gray-400 mt-0.5">
                                            {plan.pushedToJiraAt
                                                ? `Planned: ${new Date(
                                                    plan.pushedToJiraAt
                                                ).toLocaleDateString()}`
                                                : 'Draft'
                                            }
                                        </p>
                                    </div>

                                    <span className={`text-[10px] font-black
                                        px-2 py-1 rounded-full uppercase
                                        ${getStatusStyle(plan.status)}`}>
                                        {plan.status?.replace('_', ' ')}
                                    </span>

                                    {plan.sprintOutcome && (
                                        <span className={`text-[10px]
                                            font-black px-2 py-1 rounded-full
                                            uppercase
                                            ${getOutcomeStyle(
                                                plan.sprintOutcome
                                            )}`}>
                                            {plan.sprintOutcome}
                                        </span>
                                    )}
                                </div>

                                {/* Stats + expand */}
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:flex
                                        items-center gap-6 text-center">
                                        <div>
                                            <p className="text-base
                                                font-black text-[#2c3e50]">
                                                {plan.tasks?.length || 0}
                                            </p>
                                            <p className="text-[10px]
                                                text-gray-400 uppercase">
                                                Tasks
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-base
                                                font-black text-[#2c3e50]">
                                                {plan.totalPlannedPoints}
                                            </p>
                                            <p className="text-[10px]
                                                text-gray-400 uppercase">
                                                Points
                                            </p>
                                        </div>
                                        {plan.actualVelocity != null && (
                                            <div>
                                                <p className="text-base
                                                    font-black
                                                    text-[#18bc9c]">
                                                    {plan.actualVelocity}
                                                </p>
                                                <p className="text-[10px]
                                                    text-gray-400 uppercase">
                                                    Delivered
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-base
                                                font-black text-[#2c3e50]">
                                                {plan.totalEstimatedDays
                                                    ?.toFixed(1)}d
                                            </p>
                                            <p className="text-[10px]
                                                text-gray-400 uppercase">
                                                Est. Days
                                            </p>
                                        </div>
                                    </div>

                                    {expanded === plan._id
                                        ? <ChevronUp size={16}
                                            className="text-gray-400" />
                                        : <ChevronDown size={16}
                                            className="text-gray-400" />
                                    }
                                </div>
                            </div>

                            {/* Expanded Task Table */}
                            {expanded === plan._id && (
                                <div className="border-t border-gray-100">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    {[
                                                        'Task',
                                                        'Type',
                                                        'Points',
                                                        'Predicted',
                                                        'Actual',
                                                        'Accuracy',
                                                        'Done'
                                                    ].map(h => (
                                                        <th key={h}
                                                            className="p-4
                                                            text-[10px]
                                                            font-black
                                                            text-gray-400
                                                            uppercase
                                                            text-left">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plan.tasks?.map((task, i) => {
                                                    const acc = getAccuracyInfo(
                                                        task.predictedDays,
                                                        task.actualDays
                                                    );
                                                    return (
                                                        <tr key={i}
                                                            className="border-t
                                                            border-gray-50
                                                            hover:bg-gray-50
                                                            transition-colors">
                                                            <td className="p-4">
                                                                <p className="font-medium
                                                                    text-[#2c3e50]
                                                                    text-xs
                                                                    max-w-xs
                                                                    truncate">
                                                                    {task.title}
                                                                </p>
                                                                {task.jiraKey && (
                                                                    <p className="text-[10px]
                                                                        text-gray-400 mt-0.5">
                                                                        {task.jiraKey}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`
                                                                    text-[10px]
                                                                    font-bold
                                                                    px-2 py-0.5
                                                                    rounded-full
                                                                    ${getTypeColor(task.taskType)}`}>
                                                                    {task.taskType || 'general'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4
                                                                font-bold
                                                                text-[#2c3e50]
                                                                text-xs">
                                                                {task.storyPoints}
                                                            </td>
                                                            <td className="p-4
                                                                text-gray-500
                                                                text-xs">
                                                                {task.predictedDays
                                                                    ? `${task.predictedDays}d`
                                                                    : '—'
                                                                }
                                                            </td>
                                                            <td className="p-4
                                                                font-bold
                                                                text-[#18bc9c]
                                                                text-xs">
                                                                {task.actualDays
                                                                    ? `${task.actualDays}d`
                                                                    : '—'
                                                                }
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`
                                                                    text-[10px]
                                                                    font-bold
                                                                    px-2 py-1
                                                                    rounded-full
                                                                    ${acc.bg}
                                                                    ${acc.color}`}>
                                                                    {acc.label}
                                                                </span>
                                                            </td>
                                                            <td className="p-4
                                                                text-center">
                                                                {task.wasCompleted === null
                                                                    || task.wasCompleted === undefined
                                                                    ? <Clock size={14}
                                                                        className="text-gray-300
                                                                        mx-auto" />
                                                                    : task.wasCompleted
                                                                    ? <CheckCircle2 size={14}
                                                                        className="text-green-500
                                                                        mx-auto" />
                                                                    : <XCircle size={14}
                                                                        className="text-red-400
                                                                        mx-auto" />
                                                                }
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Learning note */}
                                    {plan.status === 'COMPLETED' && (
                                        <div className="p-4 bg-[#18bc9c]/5
                                            border-t border-[#18bc9c]/10">
                                            <p className="text-xs
                                                text-[#18bc9c] font-bold
                                                flex items-center gap-2">
                                                <TrendingUp size={12} />
                                                ML model learned from this
                                                sprint's actual outcomes
                                            </p>
                                        </div>
                                    )}
                                    {plan.status === 'PUSHED_TO_JIRA' && (
                                        <div className="p-4 bg-blue-50
                                            border-t border-blue-100">
                                            <p className="text-xs
                                                text-blue-500 font-bold
                                                flex items-center gap-2">
                                                <Clock size={12} />
                                                Actual data will be captured
                                                when sprint completes in Jira
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SprintHistory;
