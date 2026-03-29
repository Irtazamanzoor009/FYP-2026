import React, { useEffect, useState, useCallback } from 'react';
import {
    Plus, Trash2, Zap, Send, Loader2,
    AlertTriangle, CheckCircle2, ChevronDown,
    ChevronUp, Link2, X, BrainCircuit,
    Calendar, Clock, Users, TrendingUp,
    ShieldAlert, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import useSprintPlannerStore from '../../store/sprintPlannerStore';
import useAuthStore from '../../store/authStore';

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const POINTS_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

const PRIORITY_COLORS = {
    Highest: 'text-red-600 bg-red-50',
    High: 'text-orange-600 bg-orange-50',
    Medium: 'text-yellow-600 bg-yellow-50',
    Low: 'text-green-600 bg-green-50',
    Lowest: 'text-gray-500 bg-gray-100'
};

const TYPE_COLORS = {
    backend: 'bg-blue-50 text-blue-600',
    frontend: 'bg-pink-50 text-pink-600',
    testing: 'bg-yellow-50 text-yellow-600',
    general: 'bg-gray-100 text-gray-500'
};

// ─────────────────────────────────────────
// Task Row Component
// ─────────────────────────────────────────
const TaskRow = ({
    task,
    allTasks,
    onUpdate,
    onRemove,
    onEstimate,
    onAddDep,
    onRemoveDep,
    isEstimating
}) => {
    const [showDeps, setShowDeps] = useState(false);

    const dependencyTasks = (task.dependsOn || [])
        .map(id => allTasks.find(t => t.tempId === id))
        .filter(Boolean);

    const availableForDep = allTasks.filter(
        t => t.tempId !== task.tempId &&
            !(task.dependsOn || []).includes(t.tempId)
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {/* Row 1: Title + Remove */}
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={task.title}
                        onChange={e => onUpdate(task.tempId, { title: e.target.value })}
                        onBlur={() => task.title.trim() && onEstimate(task.tempId)}
                        placeholder="Task title (e.g. Build REST API for authentication)"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-[#2c3e50] focus:ring-1 focus:ring-[#18bc9c] outline-none"
                    />
                </div>
                <button
                    onClick={() => onRemove(task.tempId)}
                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Row 2: Controls */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Priority */}
                <select
                    value={task.priority}
                    onChange={e => onUpdate(task.tempId, { priority: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-[#18bc9c] outline-none"
                >
                    {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                {/* Story Points */}
                <select
                    value={task.storyPoints}
                    onChange={e => onUpdate(task.tempId, {
                        storyPoints: parseInt(e.target.value)
                    })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-[#18bc9c] outline-none"
                >
                    {POINTS_OPTIONS.map(p => (
                        <option key={p} value={p}>{p} pts</option>
                    ))}
                </select>

                {/* Task type badge */}
                {task.taskType && (
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${TYPE_COLORS[task.taskType] || TYPE_COLORS.general}`}>
                        {task.taskType}
                    </span>
                )}

                {/* Estimate button */}
                <button
                    onClick={() => onEstimate(task.tempId)}
                    disabled={!task.title.trim() || isEstimating === task.tempId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18bc9c]/10 text-[#18bc9c] rounded-lg text-xs font-bold hover:bg-[#18bc9c]/20 transition-colors disabled:opacity-50"
                >
                    {isEstimating === task.tempId
                        ? <Loader2 size={12} className="animate-spin" />
                        : <BrainCircuit size={12} />
                    }
                    {isEstimating === task.tempId ? 'Estimating...' : 'Estimate'}
                </button>

                {/* Dependency button */}
                <button
                    onClick={() => setShowDeps(!showDeps)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:border-[#18bc9c] transition-colors"
                >
                    <Link2 size={12} />
                    Depends on {(task.dependsOn || []).length > 0 && `(${task.dependsOn.length})`}
                    {showDeps ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
            </div>

            {/* Row 3: ML Prediction */}
            {task.estimatedDays !== null && task.estimatedDays !== undefined && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                            Est. Duration
                        </p>
                        <p className="text-sm font-black text-[#2c3e50]">
                            {task.estimatedDays} days
                        </p>
                        <p className="text-[10px] text-gray-400">
                            {task.confidenceLow}–{task.confidenceHigh} days
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                            Suggested Pts
                        </p>
                        <p className="text-sm font-black text-[#18bc9c]">
                            {task.suggestedStoryPoints} pts
                        </p>
                    </div>
                    {task.assignee && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">
                                Suggested Assignee
                            </p>
                            <p className="text-sm font-bold text-[#2c3e50]">
                                {task.assignee.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                                {task.assignee.skillMatch}% skill match
                            </p>
                        </div>
                    )}
                    {task.suggestedDueDate && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">
                                Due Date
                            </p>
                            <p className="text-sm font-bold text-[#2c3e50]">
                                {task.suggestedDueDate}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Row 4: Dependencies */}
            {showDeps && (
                <div className="space-y-3 pt-2 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase">
                        This task depends on:
                    </p>

                    {/* Existing dependencies */}
                    {dependencyTasks.map(dep => (
                        <div key={dep.tempId} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                            <span className="text-xs font-medium text-orange-700">
                                {dep.title || 'Untitled task'}
                            </span>
                            <button
                                onClick={() => onRemoveDep(task.tempId, dep.tempId)}
                                className="p-1 hover:bg-orange-100 rounded"
                            >
                                <X size={12} className="text-orange-500" />
                            </button>
                        </div>
                    ))}

                    {/* Add dependency */}
                    {availableForDep.length > 0 && (
                        <select
                            defaultValue=""
                            onChange={async (e) => {
                                if (!e.target.value) return;
                                const result = await onAddDep(
                                    task.tempId, e.target.value
                                );
                                if (!result.success) {
                                    toast.error(result.message || 'Circular dependency!');
                                } else {
                                    toast.success('Dependency added');
                                }
                                e.target.value = '';
                            }}
                            className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#18bc9c] outline-none bg-white"
                        >
                            <option value="">+ Add dependency...</option>
                            {availableForDep.map(t => (
                                <option key={t.tempId} value={t.tempId}>
                                    {t.title || 'Untitled task'}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────
const SprintPlanner = () => {
    const {
        tasks, sprintName, sprintGoal, plannedDurationDays,
        planResult, isPlanning, isPushingToJira, isEstimating,
        anomalyResult, isCheckingAnomaly, anomalyModelInfo,
        setSprintMeta, addTask, updateTask, removeTask,
        estimateTask, addDependency, removeDependency,
        generatePlan, pushToJira,
        checkAnomalies, fetchAnomalyModelInfo, resetPlan
    } = useSprintPlannerStore();

    const { selectedProject } = useAuthStore();

    useEffect(() => {
        fetchAnomalyModelInfo();
        checkAnomalies();
    }, [selectedProject?.key]);

    const handleAddTask = () => {
        const tempId = addTask({
            title: '',
            priority: 'Medium',
            storyPoints: 5
        });
    };

    const handleGeneratePlan = async () => {
        if (tasks.length === 0) {
            toast.error('Add at least one task first');
            return;
        }
        if (!sprintName.trim()) {
            toast.error('Sprint name is required');
            return;
        }
        const tid = toast.loading('Generating ML sprint plan...');
        const res = await generatePlan();
        if (res.success) toast.success('Sprint plan generated!', { id: tid });
        else toast.error(res.message || 'Planning failed', { id: tid });
    };

    const handlePushToJira = async () => {
        if (!planResult) {
            toast.error('Generate a plan first');
            return;
        }
        const tid = toast.loading('Creating sprint in Jira...');
        const res = await pushToJira();
        if (res.success) {
            toast.success(
                `Sprint "${sprintName}" created in Jira as FUTURE sprint!`,
                { id: tid, duration: 5000 }
            );
        } else {
            toast.error(res.message || 'Push to Jira failed', { id: tid });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">
                        AI Sprint Planner
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        ML-powered duration estimation and role-aware task assignment.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Anomaly alert */}
                    {anomalyResult?.is_anomaly && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
                            <ShieldAlert size={16} className="text-red-500" />
                            <span className="text-xs font-bold text-red-600">
                                Anomaly Detected
                            </span>
                        </div>
                    )}

                    {/* Model badge */}
                    {anomalyModelInfo && (
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase ${anomalyModelInfo.model_type === 'personal'
                                ? 'bg-[#18bc9c]/10 text-[#18bc9c]'
                                : 'bg-yellow-50 text-yellow-600'
                            }`}>
                            {anomalyModelInfo.model_type === 'personal'
                                ? `🎯 Personal Model (${anomalyModelInfo.sprints_used || '?'} sprints)`
                                : '🌍 Global Baseline'
                            }
                        </span>
                    )}
                </div>
            </header>

            {/* Anomaly Alert Banner */}
            {anomalyResult?.is_anomaly && anomalyResult?.description && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-700">
                            Current Sprint Anomaly Detected
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                            {anomalyResult.description}
                        </p>
                        <p className="text-[10px] text-red-500 mt-1 italic">
                            Consider addressing current sprint issues before planning next sprint.
                        </p>
                    </div>
                </div>
            )}

            {/* Sprint Meta */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-[#18bc9c]" />
                    Sprint Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                            Sprint Name *
                        </label>
                        <input
                            type="text"
                            value={sprintName}
                            onChange={e => setSprintMeta(e.target.value, sprintGoal, plannedDurationDays)}
                            placeholder="e.g. Sprint 6 — ML Integration"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#18bc9c] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                            Sprint Goal
                        </label>
                        <input
                            type="text"
                            value={sprintGoal}
                            onChange={e => setSprintMeta(sprintName, e.target.value, plannedDurationDays)}
                            placeholder="e.g. Complete all API endpoints"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#18bc9c] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                            Duration (days)
                        </label>
                        <input
                            type="number"
                            value={plannedDurationDays}
                            onChange={e => setSprintMeta(
                                sprintName, sprintGoal,
                                parseInt(e.target.value) || 14
                            )}
                            min="7" max="30"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#18bc9c] outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Tasks */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#2c3e50] flex items-center gap-2">
                        <Zap size={16} className="text-[#18bc9c]" />
                        Tasks ({tasks.length})
                    </h3>
                    <button
                        onClick={handleAddTask}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2c3e50] text-white rounded-xl text-xs font-bold hover:bg-[#18bc9c] transition-all"
                    >
                        <Plus size={14} /> Add Task
                    </button>
                </div>

                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Zap size={32} className="text-gray-300" />
                        <p className="text-sm text-gray-400">
                            No tasks yet. Add tasks to start planning.
                        </p>
                        <button
                            onClick={handleAddTask}
                            className="flex items-center gap-2 px-4 py-2 bg-[#18bc9c] text-white rounded-xl text-xs font-bold"
                        >
                            <Plus size={14} /> Add First Task
                        </button>
                    </div>
                )}

                {tasks.map(task => (
                    <TaskRow
                        key={task.tempId}
                        task={task}
                        allTasks={tasks}
                        onUpdate={updateTask}
                        onRemove={removeTask}
                        onEstimate={estimateTask}
                        onAddDep={addDependency}
                        onRemoveDep={removeDependency}
                        isEstimating={isEstimating}
                    />
                ))}
            </div>

            {/* Plan Summary (shown after generatePlan) */}
            {planResult && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-[#2c3e50] px-6 py-4 text-white">
                        <h3 className="font-bold flex items-center gap-2">
                            <BrainCircuit size={18} className="text-[#18bc9c]" />
                            Sprint Plan Summary
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <p className="text-2xl font-black text-[#2c3e50]">
                                    {planResult.summary.totalTasks}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Tasks</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <p className="text-2xl font-black text-[#2c3e50]">
                                    {planResult.summary.totalPoints}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Points</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <p className="text-2xl font-black text-[#2c3e50]">
                                    {planResult.summary.totalEstimatedDays}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Est. Days</p>
                            </div>
                            <div className="text-center p-4 rounded-xl"
                                style={{
                                    backgroundColor: planResult.summary.estimatedSuccessProbability >= 60
                                        ? '#18bc9c15'
                                        : '#e74c3c15'
                                }}
                            >
                                <p className="text-2xl font-black"
                                    style={{
                                        color: planResult.summary.estimatedSuccessProbability >= 60
                                            ? '#18bc9c'
                                            : '#e74c3c'
                                    }}
                                >
                                    {planResult.summary.estimatedSuccessProbability}%
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">
                                    Success Est.
                                </p>
                            </div>
                        </div>

                        {/* Warnings */}
                        {planResult.summary.warnings?.length > 0 && (
                            <div className="space-y-2">
                                {planResult.summary.warnings.map((w, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                                        <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-yellow-700">{w.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Workload summary */}
                        {planResult.summary.workloadByMember?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase mb-3">
                                    Team Workload
                                </h4>
                                <div className="space-y-2">
                                    {planResult.summary.workloadByMember.map((m, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-[#2c3e50] w-32 truncate">
                                                {m.name}
                                            </span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min(m.workloadPercent, 100)}%`,
                                                        backgroundColor: m.status === 'Overloaded'
                                                            ? '#e74c3c'
                                                            : '#18bc9c'
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-xs font-bold w-14 text-right ${m.status === 'Overloaded'
                                                    ? 'text-red-500'
                                                    : 'text-[#18bc9c]'
                                                }`}>
                                                {m.workloadPercent}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                    onClick={resetPlan}
                    className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                >
                    Reset Plan
                </button>
                <button
                    onClick={handleGeneratePlan}
                    disabled={isPlanning || tasks.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-[#2c3e50] text-white rounded-xl text-sm font-bold hover:bg-[#18bc9c] transition-all disabled:opacity-60"
                >
                    {isPlanning
                        ? <><Loader2 size={16} className="animate-spin" /> Planning...</>
                        : <><BrainCircuit size={16} /> Generate ML Plan</>
                    }
                </button>
                <button
                    onClick={handlePushToJira}
                    disabled={isPushingToJira || !planResult}
                    className="flex items-center gap-2 px-6 py-3 bg-[#18bc9c] text-white rounded-xl text-sm font-bold hover:bg-[#128f76] transition-all shadow-lg disabled:opacity-60"
                >
                    {isPushingToJira
                        ? <><Loader2 size={16} className="animate-spin" /> Creating...</>
                        : <><Send size={16} /> Push to Jira</>
                    }
                </button>
            </div>

        </div>
    );
};

export default SprintPlanner;