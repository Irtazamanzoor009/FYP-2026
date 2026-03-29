import { create } from 'zustand';
import API from '../API/API';

const useSprintPlannerStore = create((set, get) => ({
    // Task list being planned
    tasks: [],
    sprintName: '',
    sprintGoal: '',
    plannedDurationDays: 14,

    // Plan result from backend
    planResult: null,
    isPlanning: false,
    isPushingToJira: false,
    isEstimating: null, // taskTempId being estimated

    // Anomaly detection
    anomalyResult: null,
    isCheckingAnomaly: false,
    anomalyModelInfo: null,

    // ── Task management ──

    setSprintMeta: (name, goal, duration) => set({
        sprintName: name,
        sprintGoal: goal,
        plannedDurationDays: duration
    }),

    addTask: (taskData) => {
        const tempId = `task_${Date.now()}_${Math.random()
            .toString(36).slice(2)}`;
        set(state => ({
            tasks: [...state.tasks, {
                tempId,
                title: '',
                description: '',
                priority: 'Medium',
                storyPoints: 5,
                dependsOn: [],
                estimatedDays: null,
                confidenceLow: null,
                confidenceHigh: null,
                suggestedStoryPoints: null,
                assignee: null,
                assigneeId: null,
                suggestedDueDate: null,
                taskType: null,
                ...taskData
            }]
        }));
        return tempId;
    },

    updateTask: (tempId, updates) => set(state => ({
        tasks: state.tasks.map(t =>
            t.tempId === tempId ? { ...t, ...updates } : t
        )
    })),

    removeTask: (tempId) => set(state => ({
        tasks: state.tasks.filter(t => t.tempId !== tempId),
        // Also remove from dependsOn of other tasks
        tasks: state.tasks
            .filter(t => t.tempId !== tempId)
            .map(t => ({
                ...t,
                dependsOn: (t.dependsOn || []).filter(id => id !== tempId)
            }))
    })),

    // ── Estimate single task ──
    estimateTask: async (tempId) => {
        const task = get().tasks.find(t => t.tempId === tempId);
        if (!task || !task.title.trim()) return;

        set({ isEstimating: tempId });
        try {
            const res = await API.post('/sprint-planner/estimate', {
                title: task.title,
                description: task.description,
                priority: task.priority,
                storyPoints: task.storyPoints
            });

            if (res.data.success) {
                const data = res.data.data;
                set(state => ({
                    tasks: state.tasks.map(t =>
                        t.tempId === tempId ? {
                            ...t,
                            estimatedDays: data.estimatedDays,
                            confidenceLow: data.confidenceLow,
                            confidenceHigh: data.confidenceHigh,
                            suggestedStoryPoints: data.suggestedStoryPoints,
                            taskType: data.taskType,
                            estimationSource: data.source
                        } : t
                    ),
                    isEstimating: null
                }));
            }
        } catch (err) {
            set({ isEstimating: null });
        }
    },

    // ── Check dependency for circular reference ──
    checkDependency: async (newTaskId, dependsOnId) => {
        try {
            const res = await API.post('/sprint-planner/check-dependency', {
                tasks: get().tasks,
                newTaskId,
                dependsOnId
            });
            return res.data.data;
        } catch {
            return { isCircular: false };
        }
    },

    addDependency: async (taskTempId, dependsOnTempId) => {
        // Check for circular dependency first
        const check = await get().checkDependency(taskTempId, dependsOnTempId);
        if (check.isCircular) {
            return {
                success: false,
                message: check.message
            };
        }
        set(state => ({
            tasks: state.tasks.map(t =>
                t.tempId === taskTempId
                    ? {
                        ...t,
                        dependsOn: [...new Set([...(t.dependsOn || []), dependsOnTempId])]
                    }
                    : t
            )
        }));
        return { success: true };
    },

    removeDependency: (taskTempId, dependsOnTempId) => set(state => ({
        tasks: state.tasks.map(t =>
            t.tempId === taskTempId
                ? { ...t, dependsOn: (t.dependsOn || []).filter(id => id !== dependsOnTempId) }
                : t
        )
    })),

    // ── Generate full sprint plan ──
    generatePlan: async () => {
        const state = get();
        if (state.tasks.length === 0) return { success: false };

        set({ isPlanning: true });
        try {
            const res = await API.post('/sprint-planner/plan', {
                sprintName: state.sprintName || 'Sprint Plan',
                sprintGoal: state.sprintGoal,
                plannedDurationDays: state.plannedDurationDays,
                tasks: state.tasks.map(t => ({
                    tempId: t.tempId,
                    title: t.title,
                    description: t.description,
                    priority: t.priority,
                    storyPoints: t.storyPoints,
                    dependsOn: t.dependsOn
                }))
            });

            if (res.data.success) {
                const planResult = res.data.data;

                // Update tasks with ML predictions + assignments
                set(state => ({
                    tasks: state.tasks.map(t => {
                        const planned = planResult.tasks.find(
                            p => p.tempId === t.tempId
                        );
                        if (!planned) return t;
                        return {
                            ...t,
                            estimatedDays: planned.estimatedDays,
                            confidenceLow: planned.confidenceLow,
                            confidenceHigh: planned.confidenceHigh,
                            assignee: planned.assignee,
                            assigneeId: planned.assigneeId,
                            suggestedDueDate: planned.suggestedDueDate,
                            taskType: planned.taskType
                        };
                    }),
                    planResult,
                    isPlanning: false
                }));
                return { success: true };
            }
            set({ isPlanning: false });
            return { success: false };
        } catch (err) {
            set({ isPlanning: false });
            return {
                success: false,
                message: err.response?.data?.message || 'Planning failed'
            };
        }
    },

    // ── Push sprint to Jira ──
    pushToJira: async () => {
        const state = get();
        set({ isPushingToJira: true });
        try {
            const res = await API.post('/sprint-planner/push-to-jira', {
                sprintName: state.sprintName,
                sprintGoal: state.sprintGoal,
                plannedDurationDays: state.plannedDurationDays,
                tasks: state.tasks
            });

            set({ isPushingToJira: false });
            return res.data;
        } catch (err) {
            set({ isPushingToJira: false });
            return {
                success: false,
                message: err.response?.data?.message || 'Push to Jira failed'
            };
        }
    },

    // ── Anomaly detection ──
    checkAnomalies: async () => {
        set({ isCheckingAnomaly: true });
        try {
            const res = await API.get('/sprint-planner/anomaly-check');
            set({
                anomalyResult: res.data.data,
                isCheckingAnomaly: false
            });
            return res.data.data;
        } catch {
            set({ isCheckingAnomaly: false });
            return null;
        }
    },

    fetchAnomalyModelInfo: async () => {
        try {
            const res = await API.get('/sprint-planner/anomaly-model-info');
            set({ anomalyModelInfo: res.data.data });
        } catch {
            set({ anomalyModelInfo: null });
        }
    },

    // ── Reset ──
    resetPlan: () => set({
        tasks: [],
        sprintName: '',
        sprintGoal: '',
        plannedDurationDays: 14,
        planResult: null
    })
}));

export default useSprintPlannerStore;